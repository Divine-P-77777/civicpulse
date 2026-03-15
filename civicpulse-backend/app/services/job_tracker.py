"""
In-memory job tracker for background ingestion tasks.
Allows the frontend to reconnect and see running/completed/failed jobs.
"""
import uuid
import time
import logging
from typing import Optional

logger = logging.getLogger(__name__)

import boto3
from app.config import AWS_REGION

dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
TABLE_NAME = "CivicPulseJobs"

# Auto-purge completed/failed jobs after this many seconds
JOB_TTL_SECONDS = 3600  # 1 hour

def _get_table():
    return dynamodb.Table(TABLE_NAME)

def ensure_job_table():
    """Ensure the DynamoDB table for jobs exists."""
    try:
        dynamodb.create_table(
            TableName=TABLE_NAME,
            KeySchema=[
                {'AttributeName': 'job_id', 'KeyType': 'HASH'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'job_id', 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        print(f"✅ Created table {TABLE_NAME}")
    except dynamodb.meta.client.exceptions.ResourceInUseException:
        pass
    except Exception as e:
        print(f"⚠️ Could not ensure table {TABLE_NAME}: {e}")

# Ensure table exists on import
ensure_job_table()


def create_job(file_key: str, ingest_type: str, socket_id: Optional[str] = None, metadata: Optional[dict] = None, admin_id: Optional[str] = None) -> str:
    """Create a new job and return its ID."""
    job_uuid = str(uuid.uuid4())
    job_id = job_uuid[:8]
    now = int(time.time())
    item = {
        "job_id": job_id,
        "admin_id": admin_id or "system",  # Enable per-admin isolation
        "file_key": file_key or "unknown",
        "ingest_type": ingest_type,
        "status": "running",
        "stage": "upload",
        "progress": 0,
        "message": "Starting...",
        "detail": {},
        "metadata": metadata or {},
        "error": None,
        "socket_id": socket_id,
        "started_at": now,
        "updated_at": now,
    }
    _get_table().put_item(Item=item)
    logger.info(f"Job {job_id} created for {file_key} ({ingest_type}) by admin {admin_id}")
    return job_id


def update_job(
    job_id: str,
    progress: Optional[int] = None,
    stage: Optional[str] = None,
    message: Optional[str] = None,
    detail: Optional[dict] = None,
    status: Optional[str] = None,
    error: Optional[str] = None,
):
    """Update a running job's state in DynamoDB."""
    now = int(time.time())
    update_expr = "SET updated_at = :now"
    attr_values = {":now": now}
    
    if progress is not None:
        update_expr += ", progress = :p"
        attr_values[":p"] = progress
    if stage is not None:
        update_expr += ", stage = :s"
        attr_values[":s"] = stage
    if message is not None:
        update_expr += ", message = :m"
        attr_values[":m"] = message
    if detail is not None:
        update_expr += ", detail = :d"
        attr_values[":d"] = detail
    if status is not None:
        update_expr += ", #st = :st"
        attr_values[":st"] = status
    if error is not None:
        update_expr += ", #err = :err, #st = :failed_st"
        attr_values[":err"] = error
        attr_values[":failed_st"] = "failed"

    attr_names = {}
    if status is not None or error is not None:
        attr_names["#st"] = "status"
    if error is not None:
        attr_names["#err"] = "error"

    try:
        kwargs = {
            "Key": {"job_id": job_id},
            "UpdateExpression": update_expr,
            "ExpressionAttributeValues": attr_values
        }
        if attr_names:
            kwargs["ExpressionAttributeNames"] = attr_names
            
        _get_table().update_item(**kwargs)
    except Exception as e:
        logger.error(f"Failed to update job {job_id}: {e}")


def complete_job(job_id: str, message: str = "Done"):
    """Mark a job as completed."""
    update_job(job_id, progress=100, stage="done", status="completed", message=message)
    logger.info(f"Job {job_id} completed: {message}")


def fail_job(job_id: str, error: str):
    """Mark a job as failed."""
    update_job(job_id, status="failed", error=error)
    logger.error(f"Job {job_id} failed: {error}")


def save_extraction_checkpoint(job_id: str, full_text: str):
    """
    Saves extracted text to S3 as a 'ROM' checkpoint.
    Updates the job record with the S3 key.
    """
    from app.services.s3_service import upload_bytes_to_s3, S3_BUCKET
    try:
        # Save to a dedicated prefix in the same bucket
        s3_key = f"checkpoints/{job_id}_extracted.txt"
        upload_bytes_to_s3(
            content=full_text.encode("utf-8"),
            filename=f"{job_id}_extracted.txt",
            content_type="text/plain",
            tags={"job_id": job_id, "type": "checkpoint"}
        )
        # Update DynamoDB with the checkpoint key
        update_job(job_id, detail={"extraction_checkpoint": s3_key}, message="Extraction checkpoint saved.")
        logger.info(f"Checkpoint saved for job {job_id} at {s3_key}")
        return s3_key
    except Exception as e:
        logger.error(f"Failed to save checkpoint for job {job_id}: {e}")
        return None


def cancel_job(job_id: str):
    """Request cancellation of a running job."""
    update_job(job_id, status="cancelled", message="Cancellation requested...")
    logger.info(f"Job {job_id} cancellation requested")

def is_cancelled(job_id: str) -> bool:
    """Check if a job has been requested to cancel."""
    if not job_id:
        return False
    job = get_job(job_id)
    return job and job.get("status") == "cancelled"


def finalize_cancel(job_id: str, message: str = "Cancelled"):
    """Finalize a cancelled job after cleanup."""
    update_job(job_id, status="cancelled", stage="cancelled", progress=0, message=message)
    logger.info(f"Job {job_id} cancelled: {message}")


def get_job(job_id: str) -> Optional[dict]:
    """Get a single job by ID."""
    try:
        response = _get_table().get_item(Key={"job_id": job_id})
        return response.get("Item")
    except Exception:
        return None

def list_jobs(status_filter: Optional[str] = None, admin_id: Optional[str] = None) -> list:
    """List all jobs, optionally filtered by status and admin_id."""
    try:
        from boto3.dynamodb.conditions import Attr
        filter_expr = None
        
        if status_filter:
            filter_expr = Attr("status").eq(status_filter)
        
        if admin_id:
            expr = Attr("admin_id").eq(admin_id)
            filter_expr = filter_expr & expr if filter_expr else expr
            
        if filter_expr:
            response = _get_table().scan(FilterExpression=filter_expr)
        else:
            response = _get_table().scan()
        
        jobs = response.get("Items", [])
        # Sort by most recent first
        jobs.sort(key=lambda j: j.get("updated_at", 0), reverse=True)
        return jobs
    except Exception as e:
        logger.error(f"Failed to list jobs: {e}")
        return []

def _cleanup_old_jobs():
    """DynamoDB doesn't need manual cleanup if TTL is enabled, but we do it manually or skip."""
    # We'll skip manual cleanup for now or rely on a separate script/TTL attribute
    pass
