import json
import time
import logging
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.config import bedrock_client

logger = logging.getLogger(__name__)

def chunk_text(text: str):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100
    )
    return splitter.split_text(text)

def generate_embedding(text: str, max_retries: int = 5):
    """Generate embedding via Bedrock Titan with retry + backoff on throttling."""
    for attempt in range(max_retries):
        try:
            response = bedrock_client.invoke_model(
                modelId="amazon.titan-embed-text-v1",
                body=json.dumps({"inputText": text})
            )
            response_body = json.loads(response.get("body").read())
            return response_body.get("embedding")
        except Exception as e:
            if "ThrottlingException" in str(type(e).__name__) or "Too many requests" in str(e):
                wait = min(2 ** attempt + 0.5, 30)
                logger.warning(f"[Embedding] Throttled (attempt {attempt+1}/{max_retries}), retrying in {wait:.1f}s...")
                time.sleep(wait)
            else:
                raise
    raise Exception(f"Embedding failed after {max_retries} retries due to throttling")
