from fastapi import APIRouter, UploadFile, Form, Depends, Query, Path, HTTPException, File, Header, BackgroundTasks
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
import logging
import asyncio

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])

# ─── Pydantic Models ───

class UpdateResultRequest(BaseModel):
    updates: dict

# ═══════════════════════════════════════════════
# INGESTION
# ═══════════════════════════════════════════════

async def _run_admin_ingestion(ingest_type: str, bucket: str, file_key: Optional[str], content: Optional[str], meta_dict: dict, x_socket_id: Optional[str], x_live_sid: Optional[str] = None):
    """Background task orchestrator for running the long document ingestion processes."""
    try:
        result_meta = {"chunks": 0, "pages": 1, "engine": "Textract"}
        
        if ingest_type == "pdf":
            result_meta = await ingest_pdf_from_s3(bucket, file_key, meta_dict, x_socket_id)
        elif ingest_type == "image":
            from app.ingestion.image_ingest import ingest_image_from_s3
            result_meta = await ingest_image_from_s3(bucket, file_key, meta_dict, x_socket_id, live_sid=x_live_sid)
        elif ingest_type == "web":
            from app.ingestion.web_ingest import ingest_web
            chunks = await ingest_web(content, meta_dict, x_socket_id)
            result_meta = {"chunks": chunks, "pages": 0, "engine": "Scraper"}
        elif ingest_type == "pdf (url)":
            result_meta = await ingest_pdf_from_s3(bucket, file_key, meta_dict, x_socket_id)
            
        chunks_processed = result_meta.get("chunks", 0)
        pages_processed = result_meta.get("pages", 1)
        ocr_engine = result_meta.get("engine", "Textract")

        # Log completion to DynamoDB with usage stats
        from app.services.dynamodb_service import store_analysis_result
        store_analysis_result(
            query=f"Ingestion: {file_key or content}",
            summary=f"Processed {chunks_processed} chunks from {pages_processed} pages using {ocr_engine}.",
            pages_processed=pages_processed,
            ocr_engine=ocr_engine
        )

        logger.info(f"✅ Background Ingestion complete: {file_key or content} → {chunks_processed} chunks ({ocr_engine}).")
    except Exception as e:
        import traceback
        traceback.print_exc()
        if x_socket_id:
            from app.core.socket_manager import socket_manager
            # Run the async emit in a background fashion safely (since we are inside an async def kicked off via BackgroundTasks)
            try:
                loop = asyncio.get_event_loop()
                loop.create_task(socket_manager.emit_progress(100, f"Error: {str(e)}", x_socket_id))
            except:
                pass


@router.post("/ingest", status_code=202)
async def ingest_document(
    background_tasks: BackgroundTasks,
    type: str = Form("pdf"),
    file: Optional[UploadFile] = File(None),
    content: Optional[str] = Form(None),
    metadata: str = Form("{}"),
    admin: dict = Depends(get_admin_user),
    x_socket_id: Optional[str] = Header(None),
    x_live_session_id: Optional[str] = Header(None)
):
    """Admin-only endpoint. Unified background ingestion for PDF, Image, and Web/Text."""
    try:
        meta_dict = json.loads(metadata)
    except json.JSONDecodeError:
        meta_dict = {"type": type}
        
    bucket = S3_BUCKET
    file_key = None
    
    try:
        if type == "pdf":
            if not file: raise HTTPException(400, "File required for PDF ingestion")
            meta_dict["source_type"] = "global"
            # Upload immediately (fast) before returning 202
            file_key = upload_to_s3(file)
            background_tasks.add_task(_run_admin_ingestion, "pdf", bucket, file_key, None, meta_dict, x_socket_id, x_live_session_id)
            
        elif type == "image":
            if not file: raise HTTPException(400, "File required for Image ingestion")
            meta_dict["source_type"] = "global"
            file_key = upload_to_s3(file)
            background_tasks.add_task(_run_admin_ingestion, "image", bucket, file_key, None, meta_dict, x_socket_id, x_live_session_id)
            
        elif type == "web":
            if not content: raise HTTPException(400, "Content/URL required for Web ingestion")
            
            # Smart Routing: Check if the "web" content is actually a PDF URL
            is_pdf_url = content.startswith("http") and (
                content.lower().split("?")[0].endswith(".pdf")
            )

            if is_pdf_url:
                import requests
                from app.services.s3_service import upload_bytes_to_s3
                
                print(f"Detected PDF URL: {content}. Routing to PDF pipeline.")
                resp = requests.get(content, timeout=30) # Fetch the PDF synchronously to avoid bad URL errors later
                if resp.status_code == 200:
                    filename = content.split("/")[-1].split("?")[0]
                    file_key = upload_bytes_to_s3(resp.content, filename, "application/pdf")
                    meta_dict["source_type"] = "global"
                    background_tasks.add_task(_run_admin_ingestion, "pdf (url)", bucket, file_key, None, meta_dict, x_socket_id, x_live_session_id)
                    type = "pdf (url)"
                else:
                    raise HTTPException(400, f"Failed to download PDF from URL: {content}")
            else:
                meta_dict["source_type"] = "global"
                background_tasks.add_task(_run_admin_ingestion, "web", bucket, None, content, meta_dict, x_socket_id, x_live_session_id)
            
        else:
            raise HTTPException(400, f"Unsupported ingestion type: {type}")
            
        return {
            "message": f"{type.upper()} ingestion started in background", 
            "admin_email": admin.get("email"),
            "status": "processing"
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

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
