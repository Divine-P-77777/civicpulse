import uuid
import asyncio
import logging
import gc
import re
from urllib.parse import urlparse
from typing import Optional

from bs4 import BeautifulSoup
from curl_cffi import requests as curl_requests

from app.services.vector_service import vector_service
from app.services.embedding_service import generate_embedding, chunk_text
from app.core.socket_manager import socket_manager
from app.services.job_tracker import update_job, is_cancelled, fail_job, save_extraction_checkpoint, get_job

logger = logging.getLogger(__name__)

_RETRY_DELAYS = [2, 4]   # seconds to wait between retries

def _fetch_url(url: str) -> curl_requests.Response:
    """
    Fetch a URL with Chrome TLS impersonation to bypass Cloudflare/Akamai.
    Uses curl_cffi which looks identical to a real browser to the server.
    """
    last_exc: Optional[Exception] = None
    for attempt, delay in enumerate([0] + _RETRY_DELAYS, start=1):
        if delay:
            import time; time.sleep(delay)
        try:
            # impersonate="chrome120" makes the TLS fingerprint match a real Chrome browser
            resp = curl_requests.get(url, impersonate="chrome120", timeout=20, allow_redirects=True)
            
            if resp.status_code == 403 or resp.status_code == 401:
                raise PermissionError(
                    f"Access denied (HTTP {resp.status_code}) — {urlparse(url).netloc} actively blocks bots. "
                    "Try uploading this page's content as raw text instead."
                )
            if resp.status_code == 429:
                logger.warning(f"Rate limited (429) on attempt {attempt}. Will retry...")
                continue
                
            resp.raise_for_status()
            return resp
            
        except PermissionError:
            raise
        except curl_requests.RequestsError as e:
            last_exc = e
            logger.warning(f"Fetch attempt {attempt} failed: {e}")
            continue

    raise Exception(f"Failed to fetch URL after {len(_RETRY_DELAYS)+1} attempts: {last_exc}")


def _extract_text_from_html(html_bytes: bytes) -> str:
    """Parse HTML and extract meaningful text, ignoring scripts/styles/nav."""
    soup = BeautifulSoup(html_bytes, "html.parser")
    
    # Remove noise elements
    for tag in soup(["script", "style", "nav", "footer", "header",
                     "aside", "form", "noscript", "svg", "img"]):
        tag.decompose()

    # Prefer article/main content if present
    for selector in ["article", "main", '[role="main"]', ".content", "#content"]:
        content = soup.select_one(selector)
        if content:
            return content.get_text(separator=" ", strip=True)

    return soup.body.get_text(separator=" ", strip=True) if soup.body else soup.get_text(separator=" ", strip=True)


def _clean_text(text: str) -> str:
    """Collapse excessive whitespace."""
    text = re.sub(r"\s{3,}", "  ", text)
    return text.strip()


async def ingest_web(content: str, metadata: dict = None, sid: str = None, job_id: str = None) -> int:
    """
    Orchestrates web ingestion with ROM recovery and fail-safe handling.
    """
    try:
        return await _ingest_web_orchestrator(content, metadata, sid, job_id)
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Web ingestion crashed: {e}\n{error_trace}")
        if job_id:
            fail_job(job_id, f"Critical error: {str(e)}")
        if sid:
            from app.core.socket_manager import socket_manager
            await socket_manager.emit_progress(0, f"❌ Critical error: {str(e)}", sid, stage="failed")
        raise e

async def _ingest_web_orchestrator(content: str, metadata: dict = None, sid: str = None, job_id: str = None) -> int:
    detail = {"pages_extracted": 0, "total_pages": 0, "chunks_created": 0, "chunks_embedded": 0, "chunks_stored": 0, "total_chunks": 0, "engine": "Scraper"}

    def _sync_job(stage=None, progress=None, message=None):
        if job_id:
            if is_cancelled(job_id):
                raise Exception("Job was cancelled by the user")
            update_job(job_id, progress=progress, stage=stage, message=message, detail=detail)

    async def emit_status(progress: int, msg: str, stage: str = "extraction"):
        if sid:
            await socket_manager.emit_progress(progress, msg, sid, stage=stage, detail=detail, job_id=job_id)
        _sync_job(stage=stage, progress=progress, message=msg)
    if metadata is None:
        metadata = {}

    extracted_text = ""
    source_label = content if not (content.startswith("http://") or content.startswith("https://")) else "url"

    # --- RECOVERY CHECK (ROM) ---
    if job_id:
        job = get_job(job_id)
        checkpoint_key = job.get("detail", {}).get("extraction_checkpoint") if job else None
        if checkpoint_key:
            logger.info(f"Recovery mapping found for job {job_id}: {checkpoint_key}. Skipping scrape.")
            await emit_status(40, "Recovering extracted text from ROM...", stage="extraction")
            
            from app.config import s3_client
            from app.services.s3_service import S3_BUCKET
            resp = await asyncio.to_thread(s3_client.get_object, Bucket=S3_BUCKET, Key=checkpoint_key)
            extracted_text = (await asyncio.to_thread(resp['Body'].read)).decode('utf-8')
            goto_chunking = True
        else:
            goto_chunking = False
    else:
        goto_chunking = False

    if not goto_chunking:
        extracted_text = content
        source_label = "raw_text"

    # ─── URL fetch ───────────────────────────────────────
    if content.startswith("http://") or content.startswith("https://"):
        source_label = content

        if sid:
            await socket_manager.emit_progress(
                10, f"Fetching {urlparse(content).netloc}...",
                sid, stage="extraction"
            )

        try:
            # Run blocking fetch in thread pool
            resp = await asyncio.to_thread(_fetch_url, content)
        except PermissionError as e:
            raise Exception(str(e))
        except Exception as e:
            raise Exception(f"Could not fetch URL: {e}")

        # Guard against binary/PDF responses
        ct = resp.headers.get("Content-Type", "").lower()
        if "pdf" in ct or "application/octet-stream" in ct:
            raise Exception("URL points to a binary/PDF file — please use the PDF ingestion pipeline instead.")

        if sid:
            await socket_manager.emit_progress(
                35, "Parsing HTML and extracting text...",
                sid, stage="extraction"
            )

        extracted_text = _clean_text(_extract_text_from_html(resp.content))
        
        # Save to ROM Checkpoint
        if job_id:
            save_extraction_checkpoint(job_id, extracted_text)
        
        # Aggressively clear memory after extraction
        gc.collect()

    # ─── Guard: must have text ────────────────────────────
    if not extracted_text.strip():
        raise Exception("No text content found. The page may be JavaScript-rendered. Try copy-pasting the text directly.")

    if sid:
        await socket_manager.emit_progress(
            40, f"Extracted {len(extracted_text):,} characters. Chunking...",
            sid, stage="chunking"
        )

    # ─── Chunk (same as PDF pipeline) ────────────────────
    chunks = chunk_text(extracted_text)
    total_chunks = len(chunks)
    logger.info(f"Web ingestion: {total_chunks} chunks from {source_label}")

    if sid:
        await socket_manager.emit_progress(
            50, f"Created {total_chunks} chunks. Generating embeddings...",
            sid, stage="embedding",
            detail={"total_chunks": total_chunks, "chunks_created": total_chunks}
        )

    # ─── Embed & Store (Parallel Mode) ────────────────────────────────────
    await emit_status(50, f"Processing {total_chunks} chunks (Parallel Cloud Mode)...", stage="embedding")

    from app.services.embedding_service import generate_embeddings_parallel
    from app.services.vector_service import vector_service

    # We can process web pages in one big batch since they are usually smaller than PDFs
    vectors = await generate_embeddings_parallel(chunks, max_concurrency=10)
    
    docs_to_store = []
    for i, vector in enumerate(vectors):
        if vector is None: continue
        
        chunk_meta = {
            **metadata,
            "source": source_label,
            "type": "web",
            "chunk_index": i,
            "text": chunks[i],
            "content_preview": chunks[i][:200],
        }
        docs_to_store.append({
            "id": str(uuid.uuid4()),
            "vector": vector,
            "metadata": chunk_meta
        })

    if docs_to_store:
        await asyncio.to_thread(vector_service.bulk_store_vectors, docs_to_store)
    
    # Aggressively clear memory after bulk storage
    gc.collect()

    stored = len(docs_to_store)

    if sid:
        await socket_manager.emit_progress(
            100, f"✅ Web ingestion complete! {stored} chunks stored from {urlparse(source_label).netloc or 'raw text'}",
            sid, stage="done",
            detail={"total_chunks": total_chunks, "chunks_stored": stored}
        )

    return stored
