import os
import requests
import uuid
from bs4 import BeautifulSoup
from app.services.vector_service import vector_service
from app.services.embedding_service import generate_embedding

from app.core.socket_manager import socket_manager

async def ingest_web(content: str, metadata: dict = {}, sid: str = None):
    """
    Ingests text straight from a URL or raw text input, embeds it,
    and stores it in OpenSearch.
    """
    if sid: await socket_manager.emit_progress(10, "Starting web/text ingestion...", sid)
    extracted_text = content
    source_url = "raw_text"

    # If it's a URL, fetch and extract text
    if content.startswith("http://") or content.startswith("https://"):
        source_url = content
        try:
            if sid: await socket_manager.emit_progress(20, f"Fetching content from {content[:30]}...", sid)
            response = requests.get(content, timeout=10)
            response.raise_for_status()
            
            # Prevent BeautifulSoup from trying to parse a PDF or binary
            ct = response.headers.get("Content-Type", "").lower()
            if "pdf" in ct or "application/octet-stream" in ct:
                raise Exception("URL points to a PDF or binary file. Use the PDF pipeline instead.")

            if sid: await socket_manager.emit_progress(40, "Parsing HTML and extracting text...", sid)
            soup = BeautifulSoup(response.content, 'html.parser')
            # Extract basic text from HTML
            extracted_text = soup.get_text(separator=' ', strip=True)
        except Exception as e:
            raise Exception(f"Failed to fetch content from URL: {e}")

    if not extracted_text.strip():
        raise Exception("No text content found to ingest.")

    if sid: await socket_manager.emit_progress(60, "Generating embeddings (Titan)...", sid)
    # 1. Generate Embedding using Bedrock (Titan)
    vector = generate_embedding(extracted_text[:8000])

    if sid: await socket_manager.emit_progress(90, "Storing in vector database...", sid)

    # 2. Store in OpenSearch
    doc_id = str(uuid.uuid4())
    doc_meta = {
        **metadata,
        "source": source_url,
        "type": "web",
        "content_preview": extracted_text[:200]
    }
    
    vector_service.store_vector(doc_id, vector, doc_meta)
    if sid: await socket_manager.emit_progress(100, "✅ Web content ingested successfully!", sid)
    return 1  # 1 chunk processed

