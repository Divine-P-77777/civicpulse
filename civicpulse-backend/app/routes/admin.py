from fastapi import APIRouter, UploadFile, Form
from pydantic import BaseModel
import json
from app.services.s3_service import upload_to_s3
from app.services.textract_service import extract_text_from_s3
from app.services.embedding_service import chunk_text, generate_embedding
from app.services.vector_service import store_vector
import uuid

router = APIRouter()

@router.post("/ingest-law")
async def ingest_law(file: UploadFile, metadata: str = Form(...)):
    """
    Admin-only endpoint.
    metadata format example: {"type": "law", "region": "Assam"}
    """
    try:
        meta_dict = json.loads(metadata)
    except json.JSONDecodeError:
        meta_dict = {"type": "law"}
        
    # 1. Upload to S3
    file_url = upload_to_s3(file)
    
    # Simple placeholder for Textract completion logic (async flow omitted for brevity)
    simulated_text = "Simulated text from Textract for " + file.filename
    
    # 2. Chunking
    chunks = chunk_text(simulated_text)
    
    # 3. Embed and store
    for i, chunk in enumerate(chunks):
        embedding = generate_embedding(chunk)
        chunk_meta = meta_dict.copy()
        chunk_meta["chunk_index"] = i
        chunk_meta["source"] = file_url
        
        doc_id = str(uuid.uuid4())
        store_vector(doc_id, embedding, chunk_meta)
        
    return {"message": "Law ingested successfully", "chunks_processed": len(chunks)}
