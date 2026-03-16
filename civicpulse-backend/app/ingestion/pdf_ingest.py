import uuid
import asyncio
import logging
import gc
from typing import Optional

from app.services.textract_service import extract_text_from_s3, get_text_from_job_async
from app.services.embedding_service import chunk_text, generate_embedding
logger = logging.getLogger(__name__)
from app.services.vector_service import store_vector
from app.core.socket_manager import socket_manager

from app.services.job_tracker import update_job, is_cancelled, fail_job, save_extraction_checkpoint, get_job


async def ingest_pdf_from_s3(bucket: str, key: str, metadata: dict = None, sid: str = None, job_id: str = None):
    """
    Orchestrates the ingestion pipeline for a PDF stored in S3.
    """
    try:
        return await _ingest_pdf_orchestrator(bucket, key, metadata, sid, job_id)
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Ingestion crashed for {key}: {e}\n{error_trace}")
        if job_id:
            fail_job(job_id, f"Critical error: {str(e)}")
        if sid:
            from app.core.socket_manager import socket_manager
            await socket_manager.emit_progress(0, f"❌ Critical error: {str(e)}", sid, stage="failed")
        raise e

async def _ingest_pdf_orchestrator(bucket: str, key: str, metadata: dict = None, sid: str = None, job_id: str = None):
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
            if is_cancelled(job_id):
                raise Exception("Job was cancelled by the user")
            update_job(job_id, progress=progress, stage=stage, message=message, detail=detail)

    use_local = should_use_local_ocr()
    ocr_engine = "Local (Pytesseract)" if use_local else "Textract"
    detail["engine"] = ocr_engine
    pages_processed = 0
    full_text = ""
    _sync_job(stage="extraction", progress=2, message=f"Starting extraction ({ocr_engine})...")

    # --- RECOVERY CHECK (ROM) ---
    if job_id:
        job = get_job(job_id)
        checkpoint_key = job.get("detail", {}).get("extraction_checkpoint") if job else None
        if checkpoint_key:
            logger.info(f"Recovery mapping found for job {job_id}: {checkpoint_key}. Skipping extraction.")
            if sid:
                await socket_manager.emit_progress(35, "Recovering extracted text from ROM...", sid, stage="extraction")
            
            from app.config import s3_client
            from app.services.s3_service import S3_BUCKET
            resp = await asyncio.to_thread(s3_client.get_object, Bucket=S3_BUCKET, Key=checkpoint_key)
            full_text = (await asyncio.to_thread(resp['Body'].read)).decode('utf-8')
            pages_processed = job.get("detail", {}).get("pages_extracted", 0)
            
            logger.info(f"Successfully recovered {len(full_text)} chars from ROM.")
            # Skip extraction stages
            goto_chunking = True
        else:
            goto_chunking = False
    else:
        goto_chunking = False

    if not goto_chunking:
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
                            sid, stage="extraction", detail=detail, job_id=job_id
                        )
                    # Sync with DynamoDB so polling also works
                    _sync_job(stage="extraction", progress=pct, message=f"Extracting page {current_page}/{total_pages}...")

                full_text, pages_processed = await extract_text_local_async(local_path, on_page_progress=on_page)
            except RuntimeError as e:
                # Catch our specific dependency error
                error_msg = str(e)
                _sync_job(stage="failed", progress=0, message=error_msg)
                if sid:
                    await socket_manager.emit_progress(0, error_msg, sid, stage="failed", detail=detail, job_id=job_id)
                raise e
            except Exception as e:
                logger.error(f"Local extraction failed: {e}")
                raise e
            finally:
                if os.path.exists(local_path):
                    os.remove(local_path)
        else:
            # --- Textract with async polling progress ---
            local_path = os.path.join(tempfile.gettempdir(), os.path.basename(key))
            if sid:
                await socket_manager.emit_progress(
                    5, "Downloading PDF to count pages...",
                    sid, stage="extraction", detail=detail, job_id=job_id
                )
            
            await asyncio.to_thread(s3_client.download_file, bucket, key, local_path)
            
            try:
                from pypdf import PdfReader
                reader = PdfReader(local_path)
                total_pages = len(reader.pages)
                detail["total_pages"] = total_pages
                pages_processed = total_pages # Initial estimate
                logger.info(f"Target PDF has {total_pages} pages.")
            except Exception as e:
                logger.warning(f"Failed to count pages with pypdf: {e}")
                total_pages = 0
            finally:
                if os.path.exists(local_path):
                    os.remove(local_path)

            if sid:
                msg = f"Starting AWS Textract (Target: {total_pages} pages)..." if total_pages > 0 else "Starting AWS Textract job..."
                await socket_manager.emit_progress(
                    8, msg, sid, stage="extraction", detail=detail, job_id=job_id
                )

            try:
                textract_job_id = await asyncio.to_thread(extract_text_from_s3, bucket, key)

                if sid:
                    msg = f"AWS Textract submitted for {total_pages} pages. Waiting..." if total_pages > 0 else "Textract job submitted. Waiting for AWS..."
                    await socket_manager.emit_progress(
                        10, msg,
                        sid, stage="extraction", detail=detail, job_id=job_id
                    )

                async def on_textract_progress(poll_count: int, pages_found: int, message: str):
                    detail["pages_extracted"] = pages_found
                    total = int(detail.get("total_pages", 0))
                    
                    # Phase 1: Polling until SUCCESS (pages_found will be 0)
                    if pages_found == 0:
                        if total > 0:
                            message = f"Waiting for AWS to extract {total} pages... (poll #{poll_count})"
                        # Map polling to 10–25%
                        pct = 10 + min(int((poll_count / 40) * 15), 15)
                    else:
                        # Phase 2: Reading individual results (pages_found > 0)
                        if total > 0:
                            current = min(int(pages_found), total)
                            message = f"AWS Textract: Parsing page {current}/{total}..."
                            # Map result reading to 25–40%
                            pct = 25 + int((current / total) * 15)
                        else:
                            pct = 25 + min(int((poll_count / 40) * 5), 15)

                    if sid:
                        await socket_manager.emit_progress(
                            pct, message, sid, stage="extraction", detail=detail, job_id=job_id
                        )
                    # Sync with DynamoDB so polling also works
                    _sync_job(stage="extraction", progress=pct, message=message)

                full_text, pages_processed = await get_text_from_job_async(textract_job_id, on_progress=on_textract_progress)
            except Exception as e:
                logger.warning(f"Textract failed ({e}), falling back to local OCR...")
                ocr_engine = "Local (Fallback - Pytesseract)"
                detail["engine"] = ocr_engine
                
                if sid:
                    await socket_manager.emit_progress(
                        10, f"⚠️ Textract failed: {str(e)[:50]}. Falling back to Local OCR...",
                        sid, stage="extraction", detail=detail, job_id=job_id
                    )
                
                # Re-download if not present (should be cleaned up in finally, but just in case)
                local_path = os.path.join(tempfile.gettempdir(), os.path.basename(key))
                if not os.path.exists(local_path):
                    await asyncio.to_thread(s3_client.download_file, bucket, key, local_path)
                
                try:
                    from app.services.ocr_service import extract_text_local_async
                    async def on_fallback_page(current_page: int, total_pages: int):
                        detail["pages_extracted"] = current_page
                        detail["total_pages"] = total_pages
                        pct = 10 + int((current_page / max(total_pages, 1)) * 30)
                        if sid:
                            await socket_manager.emit_progress(pct, f"Fallback OCR: Page {current_page}/{total_pages}", sid, stage="extraction", detail=detail, job_id=job_id)
                        _sync_job(stage="extraction", progress=pct, message=f"Fallback OCR: Page {current_page}/{total_pages}")
                    
                    full_text, pages_processed = await extract_text_local_async(local_path, on_page_progress=on_fallback_page)
                finally:
                    if os.path.exists(local_path):
                        os.remove(local_path)

        # Save to ROM Checkpoint after successful extraction
        if job_id:
            save_extraction_checkpoint(job_id, full_text)
        
        # Aggressively clear memory after extraction
        gc.collect()

    detail["pages_extracted"] = pages_processed
    detail["total_pages"] = pages_processed

    if sid:
        await socket_manager.emit_progress(
            40, f"✅ Extraction complete — {pages_processed} pages, {len(full_text):,} characters ({ocr_engine})",
            sid, stage="extraction", detail=detail, job_id=job_id
        )
    _sync_job(stage="chunking", progress=40, message=f"Extraction complete — {pages_processed} pages")

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
    # STAGE 3: EMBEDDING & STORING (50% – 98%)
    # ═════════════════════════════════════════════
    if sid:
        await socket_manager.emit_progress(
            51, f"Processing {total_chunks} chunks (Parallel Cloud Mode)...",
            sid, stage="embedding", detail=detail
        )

    # Process in batches of 25 for better stability and progress reporting
    batch_size = 25
    from app.services.embedding_service import generate_embeddings_parallel
    from app.services.vector_service import vector_service

    for i in range(0, total_chunks, batch_size):
        if job_id:
            if is_cancelled(job_id):
                raise Exception("Job was cancelled by the user")
        
        batch_chunks = chunks[i : i + batch_size]
        logger.info(f"Generating embeddings for batch {i//batch_size + 1}...")
        
        # Parallel embedding generation for this batch
        batch_vectors = await generate_embeddings_parallel(batch_chunks, max_concurrency=10)
        
        # Prepare docs for bulk storage
        docs_to_store = []
        for j, vector in enumerate(batch_vectors):
            if vector is None: continue # Skip if failed after retries
            
            chunk_idx = i + j
            chunk_metadata = metadata.copy() if metadata else {}
            chunk_metadata.update({
                "source": f"s3://{bucket}/{key}",
                "chunk_index": chunk_idx,
                "text": batch_chunks[j]
            })
            docs_to_store.append({
                "id": str(uuid.uuid4()),
                "vector": vector,
                "metadata": chunk_metadata
            })
        
        # Bulk storage for this batch
        if docs_to_store:
            await asyncio.to_thread(vector_service.bulk_store_vectors, docs_to_store)
        
        # Update progress
        detail["chunks_embedded"] = min(i + batch_size, total_chunks)
        detail["chunks_stored"] = min(i + batch_size, total_chunks)
        
        pct = 50 + int(((i + len(batch_chunks)) / total_chunks) * 48)
        msg = f"Ingested {detail['chunks_embedded']}/{total_chunks} chunks..."
        
        if sid:
            await socket_manager.emit_progress(pct, msg, sid, stage="embedding", detail=detail, job_id=job_id)
        _sync_job(stage="embedding", progress=pct, message=msg)
        
        # Aggressively clear memory after each batch storage
        gc.collect()

    if sid:
        await socket_manager.emit_progress(
            98, f"✅ All {total_chunks} chunks ingested successfully",
            sid, stage="storing", detail=detail
        )
    _sync_job(stage="storing", progress=98, message=f"All {total_chunks} chunks ingested")

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
