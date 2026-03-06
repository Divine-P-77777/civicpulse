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
    if sid: await socket_manager.emit_progress(10, "Starting Textract analysis...", sid)
    print(f"Starting ingestion for s3://{bucket}/{key}")
    
    # 1. & 2. Text Extraction
    job_id = extract_text_from_s3(bucket, key)
    if sid: await socket_manager.emit_progress(40, "Extracting text content...", sid)
    full_text = get_text_from_job(job_id)
    if sid: await socket_manager.emit_progress(60, "Chunking and processing...", sid)
    print(f"Extraction complete. Length: {len(full_text)}")
    
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
    return len(chunks)
