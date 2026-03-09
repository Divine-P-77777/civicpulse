import uuid
import asyncio
import logging
import re
from urllib.parse import urlparse
from typing import Optional

from bs4 import BeautifulSoup
from curl_cffi import requests as curl_requests

from app.services.vector_service import vector_service
from app.services.embedding_service import generate_embedding, chunk_text
from app.core.socket_manager import socket_manager

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


async def ingest_web(content: str, metadata: dict = None, sid: str = None) -> int:
    """
    Ingests text from a URL or raw text input.
    
    - Fetches URLs with TLS impersonation (bypasses Cloudflare)
    - Chunks long pages like the PDF pipeline
    - Emits stage-aware progress events
    """
    if metadata is None:
        metadata = {}

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

    # ─── Embed + Store ────────────────────────────────────
    stored = 0
    for i, chunk in enumerate(chunks):
        embedding = await asyncio.to_thread(generate_embedding, chunk)

        chunk_meta = {
            **metadata,
            "source": source_label,
            "type": "web",
            "chunk_index": i,
            "text": chunk,
            "content_preview": chunk[:200],
        }
        doc_id = str(uuid.uuid4())
        await asyncio.to_thread(vector_service.store_vector, doc_id, embedding, chunk_meta)
        stored += 1

        if sid and (i % 3 == 0 or i == total_chunks - 1):
            pct = 50 + int(((i + 1) / total_chunks) * 48)
            await socket_manager.emit_progress(
                pct, f"Embedding & storing chunk {i + 1}/{total_chunks}...",
                sid, stage="storing",
                detail={"total_chunks": total_chunks, "chunks_embedded": i + 1, "chunks_stored": stored}
            )

    if sid:
        await socket_manager.emit_progress(
            100, f"✅ Web ingestion complete! {stored} chunks stored from {urlparse(source_label).netloc or 'raw text'}",
            sid, stage="done",
            detail={"total_chunks": total_chunks, "chunks_stored": stored}
        )

    return stored
