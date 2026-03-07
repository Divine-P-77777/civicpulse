import uuid
from app.services.textract_service import extract_text_from_s3, get_text_from_job
from app.services.embedding_service import chunk_text, generate_embedding
from app.services.vector_service import store_vector

from app.core.socket_manager import socket_manager

async def ingest_pdf_from_s3(bucket: str, key: str, metadata: dict = None, sid: str = None):
    """
    Orchestrates the ingestion pipeline for a PDF stored in S3.
    1. Start Textract Job
    2. Poll for Completion
    3. Chunk Text
    4. Generate Embeddings
    5. Store in OpenSearch
    """
    # 1. & 2. Text Extraction
    from app.core.ocr_gatekeeper import should_use_local_ocr
    from app.services.ocr_service import extract_text_local
    import os
    import tempfile
    from app.services.s3_service import s3_client
    
    use_local = should_use_local_ocr()
    ocr_engine = "Local (Pytesseract)" if use_local else "Textract"
    pages_processed = 0
    
    if use_local:
        if sid: await socket_manager.emit_progress(20, "Extracting text locally (Local OCR)...", sid)
        # Download temporarily to process locally
        local_path = os.path.join(tempfile.gettempdir(), os.path.basename(key))
        s3_client.download_file(bucket, key, local_path)
        try:
            full_text, pages_processed = extract_text_local(local_path)
        finally:
            if os.path.exists(local_path): os.remove(local_path)
    else:
        if sid: await socket_manager.emit_progress(20, "Analyzing with AWS Textract...", sid)
        job_id = extract_text_from_s3(bucket, key)
        if sid: await socket_manager.emit_progress(40, "Waiting for Textract results...", sid)
        full_text = get_text_from_job(job_id)
        # Standard assumption: Job successful means we processed it. 
        # For precision, the extract_text_from_s3/get_text_from_job could be updated to return page counts.
        # estimating 1 page if unknown for now (Textract usually returns page counts in blocks)
        pages_processed = full_text.count('\f') + 1 

    if sid: await socket_manager.emit_progress(60, f"Chunking and processing ({ocr_engine})...", sid)
    print(f"Extraction complete ({ocr_engine}). Length: {len(full_text)}")
    
    # 3. Chunking
    chunks = chunk_text(full_text)
    print(f"Created {len(chunks)} chunks.")
    
    # 4. & 5. Embedding and Storage
    total_chunks = len(chunks)
    for i, chunk in enumerate(chunks):
        if sid and i % 5 == 0: # Update every 5 chunks to avoid spam
            p = 60 + int((i / total_chunks) * 35)
            await socket_manager.emit_progress(p, f"Generating embeddings ({i}/{total_chunks})...", sid)
            
        embedding = generate_embedding(chunk)
        
        chunk_metadata = metadata.copy() if metadata else {}
        chunk_metadata.update({
            "source": f"s3://{bucket}/{key}",
            "chunk_index": i,
            "text": chunk # Storing text for retrieval
        })
        
        doc_id = str(uuid.uuid4())
        store_vector(doc_id, embedding, chunk_metadata)
    
    if sid: await socket_manager.emit_progress(100, "✅ Ingestion successfully completed!", sid)
    print("✅ Ingestion successfully completed!")
    
    return {
        "chunks": len(chunks),
        "pages": pages_processed,
        "engine": ocr_engine
    }
