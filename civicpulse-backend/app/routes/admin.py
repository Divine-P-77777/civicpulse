from fastapi import APIRouter, UploadFile, Form, Depends
from app.services.s3_service import upload_to_s3
from app.ingestion.pdf_ingest import ingest_pdf_from_s3
from app.core.auth import get_admin_user
import json

router = APIRouter(prefix="/admin", tags=["admin"])

@router.post("/ingest-law")
async def ingest_law(
    file: UploadFile, 
    metadata: str = Form(...),
    admin: dict = Depends(get_admin_user)
):
    """
    Admin-only endpoint. Secures with Auth0 and Whitelist.
    """
    try:
        meta_dict = json.loads(metadata)
    except json.JSONDecodeError:
        meta_dict = {"type": "law"}
        
    # 1. Upload to S3
    bucket = "civicpulse-documents-bucket"
    file_key = upload_to_s3(file)
    
    # 2. Run ingestion pipeline
    chunks_processed = ingest_pdf_from_s3(bucket, file_key, meta_dict)
        
    return {
        "message": "Law ingested successfully", 
        "chunks_processed": chunks_processed,
        "admin_email": admin.get("email")
    }
