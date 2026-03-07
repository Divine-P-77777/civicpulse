from app.services.textract_service import extract_text_from_s3, get_text_from_job
from app.core.ocr_gatekeeper import should_use_local_ocr
from app.services.ocr_service import extract_text_local
import os
import uuid
import tempfile
from app.services.vector_service import vector_service
from app.services.embedding_service import generate_embedding
from app.services.s3_service import s3_client

from app.core.socket_manager import socket_manager

async def ingest_image_from_s3(bucket: str, file_key: str, metadata: dict = {}, sid: str = None, live_sid: str = None):
    """
    Downloads image from S3, uses Textract or Local OCR to extract text,
    and then generates vector embeddings to store in OpenSearch.
    """
    async def emit_status(progress: int, msg: str):
        if sid:
            await socket_manager.emit_progress(progress, msg, sid)
        if live_sid:
            from app.routes.live import manager as live_manager
            await live_manager.send_json(live_sid, {"type": "ingestion_progress", "progress": progress, "message": msg})

    await emit_status(10, "Downloading image from S3...")
    
    # 1. Download from S3 temporarily
    local_path = os.path.join(tempfile.gettempdir(), os.path.basename(file_key))
    s3_client.download_file(bucket, file_key, local_path)

    try:
        use_local = should_use_local_ocr()
        ocr_engine = "Local (Pytesseract)" if use_local else "Textract"
        pages_processed = 1 # Always 1 for an image
        
        if use_local:
            await emit_status(30, "Extracting text locally (Local OCR)...")
            full_text, _ = extract_text_local(local_path)
        else:
            await emit_status(30, "Analyzing with AWS Textract...")
            job_id = extract_text_from_s3(bucket, file_key)
            await emit_status(50, "Waiting for Textract results...")
            full_text = get_text_from_job(job_id)

        # 3. Generate Embedding using Bedrock (Titan)
        await emit_status(80, f"Generating embeddings ({ocr_engine})...")
        vector = generate_embedding(full_text[:8000])

        await emit_status(95, "Storing in vector database...")

        # 4. Store in OpenSearch
        doc_id = str(uuid.uuid4())
        doc_meta = {
            **metadata,
            "source": f"s3://{bucket}/{file_key}",
            "type": "image",
            "content": full_text
        }
        
        vector_service.store_vector(doc_id, vector, doc_meta)
        
        await emit_status(100, "✅ Image ingested successfully!")
        
        if live_sid:
            from app.routes.live import send_ai_voice_message
            # Trigger AI voice response
            import asyncio
            asyncio.create_task(send_ai_voice_message(live_sid, "Okay, I've processed the image. What would you like to ask about it?"))
            
        return {
            "chunks": 1,
            "pages": pages_processed,
            "engine": ocr_engine
        }
        
    finally:
        if os.path.exists(local_path):
            os.remove(local_path)

