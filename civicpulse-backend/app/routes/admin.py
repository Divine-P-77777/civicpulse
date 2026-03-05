from fastapi import APIRouter, UploadFile, Form, Depends, Query, Path, HTTPException
from app.services.s3_service import upload_to_s3, list_files, get_presigned_url, delete_file, S3_BUCKET
from app.services.vector_service import vector_service
from app.services.dynamodb_service import (
    list_results, get_result, update_result, delete_result
)
from app.ingestion.pdf_ingest import ingest_pdf_from_s3
from app.core.auth import get_admin_user
from pydantic import BaseModel
from typing import Optional
import json

router = APIRouter(prefix="/admin", tags=["admin"])

# ─── Pydantic Models ───

class UpdateResultRequest(BaseModel):
    updates: dict

# ═══════════════════════════════════════════════
# INGESTION (existing)
# ═══════════════════════════════════════════════

@router.post("/ingest-law")
async def ingest_law(
    file: UploadFile, 
    metadata: str = Form(...),
    admin: dict = Depends(get_admin_user)
):
    """Admin-only endpoint. Upload and ingest a legal PDF."""
    try:
        meta_dict = json.loads(metadata)
    except json.JSONDecodeError:
        meta_dict = {"type": "law"}
        
    bucket = S3_BUCKET
    file_key = upload_to_s3(file)
    chunks_processed = ingest_pdf_from_s3(bucket, file_key, meta_dict)
        
    return {
        "message": "Law ingested successfully", 
        "chunks_processed": chunks_processed,
        "admin_email": admin.get("email")
    }

# ═══════════════════════════════════════════════
# VECTOR CRUD (OpenSearch)
# ═══════════════════════════════════════════════

@router.get("/vectors/stats")
async def vector_stats(admin: dict = Depends(get_admin_user)):
    """Get OpenSearch index health and document count."""
    return vector_service.get_index_stats()

@router.get("/vectors")
async def list_vectors(
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
    admin: dict = Depends(get_admin_user)
):
    """List all vector documents (paginated)."""
    return vector_service.list_documents(page=page, size=size)

@router.get("/vectors/{doc_id}")
async def get_vector(
    doc_id: str = Path(...),
    admin: dict = Depends(get_admin_user)
):
    """Get a single vector document by ID."""
    result = vector_service.get_document(doc_id)
    if not result.get("found"):
        raise HTTPException(status_code=404, detail="Vector document not found")
    return result

@router.delete("/vectors/{doc_id}")
async def delete_vector(
    doc_id: str = Path(...),
    admin: dict = Depends(get_admin_user)
):
    """Delete a single vector document by ID."""
    return vector_service.delete_document(doc_id)

@router.delete("/vectors")
async def purge_vectors(admin: dict = Depends(get_admin_user)):
    """⚠ DANGER: Purge all vector documents from the index."""
    return vector_service.delete_all_documents()

# ═══════════════════════════════════════════════
# DYNAMODB CRUD
# ═══════════════════════════════════════════════

@router.get("/dynamodb")
async def list_dynamodb(
    limit: int = Query(20, ge=1, le=100),
    admin: dict = Depends(get_admin_user)
):
    """List all DynamoDB analysis results (paginated)."""
    return list_results(limit=limit)

@router.get("/dynamodb/{doc_id}")
async def get_dynamodb(
    doc_id: str = Path(...),
    admin: dict = Depends(get_admin_user)
):
    """Get a single DynamoDB result by DocumentId."""
    result = get_result(doc_id)
    if not result.get("found"):
        raise HTTPException(status_code=404, detail="DynamoDB result not found")
    return result

@router.put("/dynamodb/{doc_id}")
async def update_dynamodb(
    doc_id: str = Path(...),
    body: UpdateResultRequest = ...,
    admin: dict = Depends(get_admin_user)
):
    """Update fields of a DynamoDB result."""
    return update_result(doc_id, body.updates)

@router.delete("/dynamodb/{doc_id}")
async def delete_dynamodb(
    doc_id: str = Path(...),
    admin: dict = Depends(get_admin_user)
):
    """Delete a DynamoDB result by DocumentId."""
    return delete_result(doc_id)

# ═══════════════════════════════════════════════
# S3 FILE CRUD
# ═══════════════════════════════════════════════

@router.get("/s3")
async def list_s3_files(
    prefix: str = Query("uploads/"),
    admin: dict = Depends(get_admin_user)
):
    """List all files in the S3 bucket."""
    return list_files(prefix=prefix)

@router.get("/s3/download")
async def download_s3_file(
    key: str = Query(...),
    admin: dict = Depends(get_admin_user)
):
    """Get a presigned download URL for an S3 file."""
    return get_presigned_url(key)

@router.delete("/s3/{key:path}")
async def delete_s3_file(
    key: str = Path(...),
    admin: dict = Depends(get_admin_user)
):
    """Delete a file from S3."""
    return delete_file(key)
