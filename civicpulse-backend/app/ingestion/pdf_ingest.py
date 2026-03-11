import uuid
import asyncio
import logging
from typing import Optional

from app.services.textract_service import extract_text_from_s3, get_text_from_job_async
from app.services.embedding_service import chunk_text, generate_embedding
from app.services.vector_service import store_vector
from app.core.socket_manager import socket_manager

logger = logging.getLogger(__name__)


async def ingest_pdf_from_s3(bucket: str, key: str, metadata: dict = None, sid: str = None, job_id: str = None):
    """
    Orchestrates the ingestion pipeline for a PDF stored in S3.
    
    Stages:
        1. extraction (0–40%)  — Textract or Local OCR with per-page/per-poll progress
        2. chunking   (40–50%) — Split text into chunks
        3. embedding  (50–90%) — Generate embeddings per chunk
        4. storing    (90–95%) — Store vectors in OpenSearch
        5. done       (100%)   — Final summary
    """
    from app.core.ocr_gatekeeper import should_use_local_ocr
    import os
    import tempfile
    from app.services.s3_service import s3_client

    # ─── Shared progress state ───
    detail = {
        "pages_extracted": 0,
        "total_pages": 0,
        "chunks_created": 0,
        "chunks_embedded": 0,
        "chunks_stored": 0,
        "total_chunks": 0,
        "engine": "Unknown"
    }

    # Helper to sync job tracker with progress
    def _sync_job(stage=None, progress=None, message=None):
        if job_id:
            from app.services.job_tracker import update_job, is_cancelled
            if is_cancelled(job_id):
                raise Exception("Job was cancelled by the user")
            update_job(job_id, progress=progress, stage=stage, message=message, detail=detail)

    use_local = should_use_local_ocr()
    ocr_engine = "Local (Pytesseract)" if use_local else "Textract"
    detail["engine"] = ocr_engine
    pages_processed = 0
    _sync_job(stage="extraction", progress=2, message=f"Starting extraction ({ocr_engine})...")

    # ═════════════════════════════════════════════
    # STAGE 1: EXTRACTION (0% – 40%)
    # ═════════════════════════════════════════════
    if use_local:
        # --- Local OCR with per-page progress ---
        if sid:
            await socket_manager.emit_progress(
                5, f"Downloading PDF for local OCR ({ocr_engine})...",
                sid, stage="extraction", detail=detail
            )

        local_path = os.path.join(tempfile.gettempdir(), os.path.basename(key))
        await asyncio.to_thread(s3_client.download_file, bucket, key, local_path)

        try:
            from app.services.ocr_service import extract_text_local_async

            async def on_page(current_page: int, total_pages: int):
                detail["pages_extracted"] = current_page
                detail["total_pages"] = total_pages
                # Map page progress to 5–40% range
                pct = 5 + int((current_page / max(total_pages, 1)) * 35)
                if sid and (current_page % 5 == 0 or current_page == total_pages):
                    await socket_manager.emit_progress(
                        pct, f"Extracting page {current_page}/{total_pages}...",
                        sid, stage="extraction", detail=detail
                    )

            full_text, pages_processed = await extract_text_local_async(local_path, on_page_progress=on_page)
        finally:
            if os.path.exists(local_path):
                os.remove(local_path)
    else:
        # --- Textract with async polling progress ---
        if sid:
            await socket_manager.emit_progress(
                5, "Starting AWS Textract job...",
                sid, stage="extraction", detail=detail
            )

        job_id = await asyncio.to_thread(extract_text_from_s3, bucket, key)

        if sid:
            await socket_manager.emit_progress(
                10, "Textract job submitted. Waiting for AWS...",
                sid, stage="extraction", detail=detail
            )

        async def on_textract_progress(poll_count: int, pages_found: int, message: str):
            detail["pages_extracted"] = pages_found
            # Map poll progress into 10–40% range (we cap at 40 polls max for calculation)
            pct = 10 + min(int((poll_count / 40) * 30), 30)
            if sid:
                await socket_manager.emit_progress(
                    pct, message, sid, stage="extraction", detail=detail
                )

        full_text, pages_processed = await get_text_from_job_async(job_id, on_progress=on_textract_progress)

    detail["pages_extracted"] = pages_processed
    detail["total_pages"] = pages_processed

    if sid:
        await socket_manager.emit_progress(
            40, f"✅ Extraction complete — {pages_processed} pages, {len(full_text):,} characters ({ocr_engine})",
            sid, stage="extraction", detail=detail
        )
    _sync_job(stage="chunking", progress=40, message=f"Extraction complete — {pages_processed} pages")

    logger.info(f"Extraction complete ({ocr_engine}). Length: {len(full_text)}")

    # ═════════════════════════════════════════════
    # STAGE 2: CHUNKING (40% – 50%)
    # ═════════════════════════════════════════════
    if sid:
        await socket_manager.emit_progress(
            42, "Splitting text into chunks...",
            sid, stage="chunking", detail=detail
        )

    chunks = chunk_text(full_text)
    total_chunks = len(chunks)
    detail["chunks_created"] = total_chunks
    detail["total_chunks"] = total_chunks

    if sid:
        await socket_manager.emit_progress(
            50, f"✅ Created {total_chunks} chunks from {pages_processed} pages",
            sid, stage="chunking", detail=detail
        )
    _sync_job(stage="embedding", progress=50, message=f"Created {total_chunks} chunks")

    logger.info(f"Created {total_chunks} chunks.")

    # ═════════════════════════════════════════════
    # STAGE 3: EMBEDDING (50% – 90%)
    # ═════════════════════════════════════════════
    if sid:
        await socket_manager.emit_progress(
            51, f"Generating embeddings for {total_chunks} chunks...",
            sid, stage="embedding", detail=detail
        )

    embedded_chunks = []  # (doc_id, embedding, chunk_metadata)

    for i, chunk in enumerate(chunks):
        if job_id:
            from app.services.job_tracker import is_cancelled
            if is_cancelled(job_id):
                raise Exception("Job was cancelled by the user")
            
        embedding = await asyncio.to_thread(generate_embedding, chunk)

        chunk_metadata = metadata.copy() if metadata else {}
        chunk_metadata.update({
            "source": f"s3://{bucket}/{key}",
            "chunk_index": i,
            "text": chunk
        })

        doc_id = str(uuid.uuid4())
        embedded_chunks.append((doc_id, embedding, chunk_metadata))

        detail["chunks_embedded"] = i + 1

        # Emit progress every 3 chunks or on the last one
        if i % 3 == 0 or i == total_chunks - 1:
            pct = 50 + int(((i + 1) / total_chunks) * 40)
            if sid:
                await socket_manager.emit_progress(
                    pct, f"Embedding chunk {i + 1}/{total_chunks}...",
                    sid, stage="embedding", detail=detail
                )
            _sync_job(stage="embedding", progress=pct, message=f"Embedding {i + 1}/{total_chunks}")
        
        # Throttle: leave headroom for live mode users to avoid Bedrock rate limiting
        await asyncio.sleep(0.3)

    if sid:
        await socket_manager.emit_progress(
            90, f"✅ All {total_chunks} embeddings generated",
            sid, stage="embedding", detail=detail
        )
    _sync_job(stage="storing", progress=90, message=f"All {total_chunks} embeddings generated")

    # ═════════════════════════════════════════════
    # STAGE 4: STORING (90% – 98%)
    # ═════════════════════════════════════════════
    if sid:
        await socket_manager.emit_progress(
            91, f"Storing {total_chunks} vectors in OpenSearch...",
            sid, stage="storing", detail=detail
        )

    for i, (doc_id, embedding, chunk_metadata) in enumerate(embedded_chunks):
        if job_id:
            from app.services.job_tracker import is_cancelled
            if is_cancelled(job_id):
                raise Exception("Job was cancelled by the user")

        await asyncio.to_thread(store_vector, doc_id, embedding, chunk_metadata)
        detail["chunks_stored"] = i + 1

        if i % 10 == 0 or i == total_chunks - 1:
            pct = 90 + int(((i + 1) / total_chunks) * 8)
            if sid:
                await socket_manager.emit_progress(
                    pct, f"Storing vector {i + 1}/{total_chunks}...",
                    sid, stage="storing", detail=detail
                )
            _sync_job(stage="storing", progress=pct, message=f"Storing {i + 1}/{total_chunks}")

    # ═════════════════════════════════════════════
    # STAGE 5: DONE (100%)
    # ═════════════════════════════════════════════
    if sid:
        await socket_manager.emit_progress(
            100, f"✅ Ingestion complete! {total_chunks} chunks from {pages_processed} pages ({ocr_engine})",
            sid, stage="done", detail=detail
        )
    _sync_job(stage="done", progress=100, message=f"Complete! {total_chunks} chunks from {pages_processed} pages")

    logger.info(f"✅ Ingestion complete: {key} → {total_chunks} chunks ({ocr_engine})")

    return {
        "chunks": total_chunks,
        "pages": pages_processed,
        "engine": ocr_engine
    }
