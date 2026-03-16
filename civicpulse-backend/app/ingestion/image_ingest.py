import os
import uuid
import tempfile
import asyncio
import logging
import gc
from typing import Optional, Dict

from app.services.textract_service import extract_text_from_s3, get_text_from_job
from app.core.ocr_gatekeeper import should_use_local_ocr
from app.services.ocr_service import extract_text_local
from app.services.vector_service import vector_service
from app.services.embedding_service import generate_embedding
from app.services.s3_service import s3_client
from app.core.socket_manager import socket_manager
from app.services.job_tracker import update_job, is_cancelled, fail_job, save_extraction_checkpoint, get_job

logger = logging.getLogger(__name__)

async def ingest_image_from_s3(bucket: str, file_key: str, metadata: Dict = {}, sid: str = None, live_sid: str = None, job_id: str = None):
    """
    Orchestrates the ingestion pipeline for an image stored in S3.
    """
    try:
        return await _ingest_image_orchestrator(bucket, file_key, metadata, sid, live_sid, job_id)
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Image ingestion crashed for {file_key}: {e}\n{error_trace}")
        if job_id:
            fail_job(job_id, f"Critical error: {str(e)}")
        if sid:
            from app.core.socket_manager import socket_manager
            await socket_manager.emit_progress(0, f"❌ Critical error: {str(e)}", sid, stage="failed")
        raise e


async def _ingest_image_orchestrator(bucket: str, file_key: str, metadata: Dict = {}, sid: str = None, live_sid: str = None, job_id: str = None):
    detail = {"pages_extracted": 0, "total_pages": 1, "chunks_created": 0, "chunks_embedded": 0, "chunks_stored": 0, "total_chunks": 1, "engine": "Textract"}

    def _sync_job(stage=None, progress=None, message=None):
        if job_id:
            if is_cancelled(job_id):
                raise Exception("Job was cancelled by the user")
            update_job(job_id, progress=progress, stage=stage, message=message, detail=detail)

    async def emit_status(progress: int, msg: str, stage: str = "extraction"):
        if sid:
            await socket_manager.emit_progress(progress, msg, sid, stage=stage, detail=detail, job_id=job_id)
        if live_sid:
            from app.routes.live import manager as live_manager
            await live_manager.send_json(live_sid, {"type": "ingestion_progress", "progress": progress, "message": msg, "job_id": job_id})
        _sync_job(stage=stage, progress=progress, message=msg)

    await emit_status(10, "Downloading image from S3...", stage="upload")

    # --- RECOVERY CHECK (ROM) ---
    full_text = ""
    pages_processed = 0
    ocr_engine = "Unknown"
    
    if job_id:
        job = get_job(job_id)
        checkpoint_key = job.get("detail", {}).get("extraction_checkpoint") if job else None
        if checkpoint_key:
            logger.info(f"Recovery mapping found for job {job_id}: {checkpoint_key}. Skipping OCR.")
            await emit_status(40, "Recovering extracted text from ROM...", stage="extraction")
            
            from app.config import s3_client
            from app.services.s3_service import S3_BUCKET
            resp = await asyncio.to_thread(s3_client.get_object, Bucket=S3_BUCKET, Key=checkpoint_key)
            full_text = (await asyncio.to_thread(resp['Body'].read)).decode('utf-8')
            pages_processed = job.get("detail", {}).get("pages_extracted", 1)
            ocr_engine = job.get("detail", {}).get("engine", "ROM Recovery")
            goto_chunking = True
        else:
            goto_chunking = False
    else:
        goto_chunking = False
    
    local_path = os.path.join(tempfile.gettempdir(), os.path.basename(file_key))
    
    if not goto_chunking:
        # 1. Download from S3 temporarily
        s3_client.download_file(bucket, file_key, local_path)
        try:
            use_local = should_use_local_ocr()
            ocr_engine = "Local (Pytesseract)" if use_local else "Textract"
            detail["engine"] = ocr_engine
            
            if use_local:
                await emit_status(30, "Extracting text locally (Local OCR)...")
                full_text, pages_processed = await asyncio.to_thread(extract_text_local, local_path)
                detail["pages_extracted"] = pages_processed
            else:
                try:
                    await emit_status(30, "Analyzing with AWS Textract...")
                    textract_job_id = extract_text_from_s3(bucket, file_key)
                    await emit_status(50, "Waiting for Textract results...")
                    from app.services.textract_service import get_text_from_job
                    full_text = get_text_from_job(textract_job_id)
                    pages_processed = 1
                    detail["pages_extracted"] = pages_processed
                except Exception as e:
                    logger.warning(f"Textract failed ({e}), falling back to local OCR...")
                    ocr_engine = "Local (Fallback - Pytesseract)"
                    detail["engine"] = ocr_engine
                    await emit_status(60, f"⚠️ Textract failed. Falling back to Local OCR...")
                    full_text, _ = await asyncio.to_thread(extract_text_local, local_path)
            
            # Save to ROM Checkpoint
            if job_id:
                save_extraction_checkpoint(job_id, full_text)
            
            # Aggressively clear memory after extraction
            gc.collect()
        finally:
            if os.path.exists(local_path):
                os.remove(local_path)

    # 3. Chunk & Embed & Store
    full_text_clean = full_text.strip() if full_text else ""
    if not full_text_clean:
        raise Exception(f"No text could be extracted from this image. Please ensure the image contains readable text.")
        
    from app.services.embedding_service import chunk_text, generate_embeddings_parallel
    from app.services.vector_service import vector_service

    chunks = chunk_text(full_text_clean)
    total_chunks = len(chunks)
    detail["total_chunks"] = total_chunks
    detail["chunks_created"] = total_chunks
    
    await emit_status(80, f"Processing {total_chunks} chunks ({ocr_engine})...", stage="embedding")

    # Parallel embedded generation
    vectors = await generate_embeddings_parallel(chunks, max_concurrency=5)
    
    # Prepare docs for bulk storage
    docs_to_store = []
    for i, vector in enumerate(vectors):
        if vector is None: continue
        
        doc_id = str(uuid.uuid4())
        chunk_meta = {
            **metadata,
            "source": f"s3://{bucket}/{file_key}",
            "type": "image",
            "chunk_index": i,
            "text": chunks[i]
        }
        docs_to_store.append({
            "id": doc_id,
            "vector": vector,
            "metadata": chunk_meta
        })
    
    # Bulk storage
    if docs_to_store:
        await asyncio.to_thread(vector_service.bulk_store_vectors, docs_to_store)
    
    detail["chunks_embedded"] = total_chunks
    detail["chunks_stored"] = total_chunks
    
    await emit_status(100, f"✅ Image ingested successfully! ({total_chunks} chunks)")
    
    # Aggressively clear memory after bulk storage
    gc.collect()
    
    if live_sid:
        from app.routes.live import send_ai_voice_message
        await send_ai_voice_message(live_sid, f"Okay, I've processed the image and stored it in {total_chunks} sections. What would you like to ask?")
        
    return {
        "chunks": total_chunks,
        "pages": pages_processed,
        "engine": ocr_engine
    }

