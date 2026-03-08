import logging
from typing import Optional

logger = logging.getLogger(__name__)

async def run_document_ingestion(bucket: str, file_key: str, metadata: dict, user_id: str, live_sid: Optional[str] = None):
    """
    Background task: Coordinates the ingestion of documents into OpenSearch.
    Picks the right ingestor based on file extension.
    """
    try:
        ext = file_key.rsplit(".", 1)[-1].lower() if "." in file_key else ""
        if ext == "pdf":
            from app.ingestion.pdf_ingest import ingest_pdf_from_s3
            chunks = await ingest_pdf_from_s3(bucket, file_key, metadata)
        elif ext in ("jpg", "jpeg", "png", "webp", "tiff"):
            from app.ingestion.image_ingest import ingest_image_from_s3
            chunks = await ingest_image_from_s3(bucket, file_key, metadata, live_sid=live_sid)
        else:
            from app.ingestion.pdf_ingest import ingest_pdf_from_s3
            logger.warning(f"Unknown file type for {file_key}, defaulting to PDF ingestor")
            chunks = await ingest_pdf_from_s3(bucket, file_key, metadata)
            
        logger.info(f"✅ User {user_id} ingestion complete: {file_key} → {chunks} chunks")
    except Exception as e:
        logger.error(f"❌ Ingestion failed for {file_key}: {e}")
