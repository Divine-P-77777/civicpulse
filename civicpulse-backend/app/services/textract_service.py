import asyncio
import logging
from typing import Optional, Callable, Awaitable
from app.config import textract_client

logger = logging.getLogger(__name__)


def extract_text_from_s3(bucket: str, key: str) -> str:
    """Start an asynchronous Textract text detection job. Returns the JobId."""
    response = textract_client.start_document_text_detection(
        DocumentLocation={
            "S3Object": {
                "Bucket": bucket,
                "Name": key
            }
        }
    )
    return response["JobId"]


async def get_text_from_job_async(
    job_id: str,
    on_progress: Optional[Callable[[int, int, str], Awaitable[None]]] = None
) -> tuple[str, int]:
    """
    Async Textract job poller with granular progress reporting.
    
    Args:
        job_id: The Textract job ID to poll.
        on_progress: Optional async callback(poll_count, status_code, status_message).
    
    Returns:
        (full_text, total_pages) tuple.
    """
    poll_count = 0
    
    # Phase 1: Poll until job completes (non-blocking)
    while True:
        response = await asyncio.to_thread(
            textract_client.get_document_text_detection, JobId=job_id
        )
        status = response["JobStatus"]
        poll_count += 1
        
        if status == "SUCCEEDED":
            break
        elif status == "FAILED":
            raise Exception(f"Textract job {job_id} failed: {response.get('StatusMessage', 'Unknown error')}")
        else:
            if on_progress:
                await on_progress(poll_count, 0, f"Textract processing... (poll #{poll_count})")
            await asyncio.sleep(3)
    
    # Phase 2: Paginate through results (non-blocking)
    full_text = ""
    next_token = None
    result_page = 0
    total_pages_detected = 0
    
    while True:
        kwargs = {"JobId": job_id}
        if next_token:
            kwargs["NextToken"] = next_token
        
        response = await asyncio.to_thread(
            textract_client.get_document_text_detection, **kwargs
        )
        result_page += 1
        
        # Track unique page numbers from blocks
        for block in response.get("Blocks", []):
            if block["BlockType"] == "PAGE":
                total_pages_detected += 1
            if block["BlockType"] == "LINE":
                full_text += block["Text"] + "\n"
        
        next_token = response.get("NextToken")
        
        if on_progress:
            await on_progress(poll_count, total_pages_detected, f"Reading Textract results (batch {result_page})...")
        
        if not next_token:
            break
    
    logger.info(f"✅ Textract extraction complete: {result_page} result batches, {total_pages_detected} pages, {len(full_text)} characters")
    return full_text, total_pages_detected


# Backward-compatible sync version (used nowhere critical, kept for safety)
def get_text_from_job(job_id: str) -> str:
    """Legacy sync poller. Prefer get_text_from_job_async for new code."""
    import time
    while True:
        response = textract_client.get_document_text_detection(JobId=job_id)
        status = response["JobStatus"]
        if status == "SUCCEEDED":
            break
        elif status == "FAILED":
            raise Exception(f"Textract job {job_id} failed.")
        else:
            time.sleep(3)
    
    full_text = ""
    next_token = None
    while True:
        kwargs = {"JobId": job_id}
        if next_token:
            kwargs["NextToken"] = next_token
        response = textract_client.get_document_text_detection(**kwargs)
        for block in response.get("Blocks", []):
            if block["BlockType"] == "LINE":
                full_text += block["Text"] + "\n"
        next_token = response.get("NextToken")
        if not next_token:
            break
    return full_text
