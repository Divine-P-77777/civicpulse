"""
In-memory job tracker for background ingestion tasks.
Allows the frontend to reconnect and see running/completed/failed jobs.
"""
import uuid
import time
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Auto-purge completed/failed jobs after this many seconds
JOB_TTL_SECONDS = 3600  # 1 hour

# In-memory store: { job_id: { ... } }
_jobs: dict = {}

# Set of job IDs that have been requested to cancel
_cancelled: set = set()


def create_job(file_key: str, ingest_type: str, socket_id: Optional[str] = None) -> str:
    """Create a new job and return its ID."""
    job_id = str(uuid.uuid4())[:8]
    _jobs[job_id] = {
        "job_id": job_id,
        "file_key": file_key or "unknown",
        "ingest_type": ingest_type,
        "status": "running",
        "stage": "upload",
        "progress": 0,
        "message": "Starting...",
        "detail": {},
        "error": None,
        "socket_id": socket_id,
        "started_at": time.time(),
        "updated_at": time.time(),
    }
    _cleanup_old_jobs()
    logger.info(f"Job {job_id} created for {file_key} ({ingest_type})")
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
    """Update a running job's state."""
    job = _jobs.get(job_id)
    if not job:
        return
    if progress is not None:
        job["progress"] = progress
    if stage is not None:
        job["stage"] = stage
    if message is not None:
        job["message"] = message
    if detail is not None:
        job["detail"] = detail
    if status is not None:
        job["status"] = status
    if error is not None:
        job["error"] = error
        job["status"] = "failed"
    job["updated_at"] = time.time()


def complete_job(job_id: str, message: str = "Done"):
    """Mark a job as completed."""
    update_job(job_id, progress=100, stage="done", status="completed", message=message)
    logger.info(f"Job {job_id} completed: {message}")


def fail_job(job_id: str, error: str):
    """Mark a job as failed."""
    update_job(job_id, status="failed", error=error)
    logger.error(f"Job {job_id} failed: {error}")


def cancel_job(job_id: str):
    """Request cancellation of a running job."""
    _cancelled.add(job_id)
    update_job(job_id, status="cancelled", message="Cancellation requested...")
    logger.info(f"Job {job_id} cancellation requested")


def is_cancelled(job_id: str) -> bool:
    """Check if a job has been requested to cancel."""
    if not job_id:
        return False
    return job_id in _cancelled


def finalize_cancel(job_id: str, message: str = "Cancelled"):
    """Finalize a cancelled job after cleanup."""
    _cancelled.discard(job_id)
    update_job(job_id, status="cancelled", stage="cancelled", progress=0, message=message)
    logger.info(f"Job {job_id} cancelled: {message}")


def get_job(job_id: str) -> Optional[dict]:
    """Get a single job by ID."""
    return _jobs.get(job_id)


def list_jobs(status_filter: Optional[str] = None) -> list:
    """List all jobs, optionally filtered by status."""
    _cleanup_old_jobs()
    jobs = list(_jobs.values())
    if status_filter:
        jobs = [j for j in jobs if j["status"] == status_filter]
    # Sort by most recent first
    jobs.sort(key=lambda j: j["updated_at"], reverse=True)
    return jobs


def _cleanup_old_jobs():
    """Remove completed/failed/cancelled jobs older than TTL."""
    now = time.time()
    expired = [
        jid for jid, j in _jobs.items()
        if j["status"] in ("completed", "failed", "cancelled") and (now - j["updated_at"]) > JOB_TTL_SECONDS
    ]
    for jid in expired:
        _cancelled.discard(jid)
        del _jobs[jid]
