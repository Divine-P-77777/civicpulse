import uuid
import boto3
from app.services.textract_service import extract_text_from_s3, get_text_from_job
from app.services.embedding_service import chunk_text, generate_embedding
from app.services.vector_service import store_vector

def ingest_image_from_s3(bucket: str, key: str, metadata: dict = None):
    """
    Orchestrates the ingestion pipeline for an image stored in S3.
    1. Start Textract Job
    2. Poll for Completion
    3. Chunk Text
    4. Generate Embeddings
    5. Store in OpenSearch
    """
    print(f"Starting ingestion for s3://{bucket}/{key}")
    
    # 1. & 2. Text Extraction
    job_id = extract_text_from_s3(bucket, key)
    full_text = get_text_from_job(job_id)
    print(f"Extraction complete. Length: {len(full_text)}")
    
    # 3. Chunking
    chunks = chunk_text(full_text)
    print(f"Created {len(chunks)} chunks.")
    
    # 4. & 5. Embedding and Storage
    for i, chunk in enumerate(chunks):
        embedding = generate_embedding(chunk)
        
        chunk_metadata = metadata.copy() if metadata else {}
        chunk_metadata.update({
            "source": f"s3://{bucket}/{key}",
            "chunk_index": i,
            "text": chunk # Storing text for retrieval
        })
        
        doc_id = str(uuid.uuid4())
        store_vector(doc_id, embedding, chunk_metadata)
    
    print("✅ Ingestion successfully completed!")
    return len(chunks)