import os
import requests
import uuid
from bs4 import BeautifulSoup
from app.services.vector_service import vector_service
from app.services.embedding_service import generate_embedding

async def ingest_web(content: str, metadata: dict = {}):
    """
    Ingests text straight from a URL or raw text input, embeds it,
    and stores it in OpenSearch.
    """
    extracted_text = content
    source_url = "raw_text"

    # If it's a URL, fetch and extract text
    if content.startswith("http://") or content.startswith("https://"):
        source_url = content
        try:
            response = requests.get(content, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            # Extract basic text from HTML
            extracted_text = soup.get_text(separator=' ', strip=True)
        except Exception as e:
            raise Exception(f"Failed to fetch content from URL: {e}")

    if not extracted_text.strip():
        raise Exception("No text content found to ingest.")

    # 1. Generate Embedding using Bedrock (Titan)
    vector = generate_embedding(extracted_text[:8000])

    # 2. Store in OpenSearch
    doc_id = str(uuid.uuid4())
    doc_meta = {
        **metadata,
        "source": source_url,
        "type": "web",
        "content_preview": extracted_text[:200]
    }
    
    vector_service.store_vector(doc_id, vector, doc_meta)
    return 1  # 1 chunk processed

