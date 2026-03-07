from google import genai
import os
import uuid
import tempfile
from app.services.vector_service import vector_service
from app.services.embedding_service import generate_embedding
from app.services.s3_service import s3_client

from app.core.socket_manager import socket_manager

async def ingest_image_from_s3(bucket: str, file_key: str, metadata: dict = {}, sid: str = None, live_sid: str = None):
    """
    Downloads image from S3, uses Gemini Vision to extract text/entities,
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
        await emit_status(30, "Extracting text using Vision...")
        # 2. Extract with Gemini
        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        
        if not api_key:
            error_msg = "❌ Missing GEMINI_API_KEY in .env file. Extraction skipped."
            print(error_msg)
            await emit_status(50, error_msg)
            # Fallback: if vision fails, we just don't have text, but we don't crash the whole pipeline
            extracted_text = "Image uploaded (Vision extraction skipped due to missing API key)"
        else:
            client = genai.Client(api_key=api_key)
            sample_file = client.files.upload(file=local_path, config={"display_name": os.path.basename(file_key)})
            response = client.models.generate_content(
                model='gemini-1.5-pro-latest',
                contents=[
                    sample_file, 
                    "Extract all text, concepts, and key information from this image."
                ]
            )
            extracted_text = response.text
        await emit_status(80, "Generating embeddings...")
        
        # 3. Generate Embedding using Bedrock (Titan)
        vector = generate_embedding(extracted_text[:8000])

        await emit_status(95, "Storing in vector database...")

        # 4. Store in OpenSearch
        doc_id = str(uuid.uuid4())
        doc_meta = {
            **metadata,
            "source": f"s3://{bucket}/{file_key}",
            "type": "image",
            "content": extracted_text
        }
        
        vector_service.store_vector(doc_id, vector, doc_meta)
        
        await emit_status(100, "✅ Image ingested successfully!")
        
        if live_sid:
            from app.routes.live import send_ai_voice_message
            # Trigger AI voice response
            import asyncio
            asyncio.create_task(send_ai_voice_message(live_sid, "Okay, I've processed the image. What would you like to ask about it?"))
            
        return 1  # 1 chunk processed
        
    finally:
        if os.path.exists(local_path):
            os.remove(local_path)

