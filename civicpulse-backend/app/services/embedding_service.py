import json
import time
import logging
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.config import bedrock_client

logger = logging.getLogger(__name__)

# QoS: Global limits for background ingestion to prevent swarming Bedrock.
# Prioritized (chat/live) queries bypass this limit for immediate response.
BACKGROUND_EMBED_SEMAPHORE = None

def _get_background_semaphore():
    global BACKGROUND_EMBED_SEMAPHORE
    import asyncio
    if BACKGROUND_EMBED_SEMAPHORE is None:
        # Default to 15 parallel embedding calls across all ingestion jobs.
        BACKGROUND_EMBED_SEMAPHORE = asyncio.Semaphore(15)
    return BACKGROUND_EMBED_SEMAPHORE

def chunk_text(text: str):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100
    )
    return splitter.split_text(text)

import threading
import time

_single_embed_semaphore = threading.BoundedSemaphore(10)

def generate_embedding(text: str):
    """Sync version for single-query embeddings (used by search)."""
    for attempt in range(6):  # Increased to 6 attempts for production
        try:
            with _single_embed_semaphore:
                response = bedrock_client.invoke_model(
                    modelId="amazon.titan-embed-text-v1",
                    body=json.dumps({"inputText": text})
                )
                response_body = json.loads(response.get("body").read())
                return response_body.get("embedding")
        except Exception as e:
            err_msg = str(e)
            if "ThrottlingException" in err_msg or "Too many requests" in err_msg:
                if attempt == 5:
                    logger.error(f"Single embedding permanently failed after 6 attempts: {e}")
                    raise
                wait = (2 ** attempt) + 0.1  # Exponential backoff
                logger.warning(f"Embedding throttled (attempt {attempt+1}), retrying in {wait:.1f}s...")
                time.sleep(wait)
            else:
                logger.error(f"Single embedding failed: {e}")
                raise

async def generate_embeddings_parallel(chunks: list[str], max_concurrency: int = 10):
    """
    Generate embeddings for multiple chunks in parallel.
    Uses a global background semaphore to prevent swamping Bedrock.
    """
    import asyncio
    
    # We use a combined semaphore: 
    # 1. Local limit (max_concurrency) to prevent too much memory/task overhead for one doc.
    # 2. Global limit (_get_background_semaphore) to protect chat/live users.
    local_semaphore = asyncio.Semaphore(max_concurrency)
    global_semaphore = _get_background_semaphore()
    
    async def _embed(chunk: str, index: int):
        for attempt in range(5):
            try:
                # Acquisition order: Local then Global
                async with local_semaphore:
                    async with global_semaphore:
                        # Wrap the sync Titan call in a thread
                        response = await asyncio.to_thread(
                            bedrock_client.invoke_model,
                            modelId="amazon.titan-embed-text-v1",
                            body=json.dumps({"inputText": chunk})
                        )
                        response_body = json.loads(response.get("body").read())
                        return index, response_body.get("embedding")
            except Exception as e:
                err_name = type(e).__name__
                err_msg = str(e)
                
                if "ThrottlingException" in err_name or "Too many requests" in err_msg:
                    wait = min(2 ** attempt + 0.5, 20)
                    logger.warning(f"[Embed-BG] Throttled at index {index}, retrying in {wait:.1f}s...")
                    await asyncio.sleep(wait)
                elif "InvalidSignatureException" in err_name or "Signature expired" in err_msg:
                    logger.warning(f"[Embed-BG] Signature expired at index {index}, retrying...")
                    continue
                else:
                    logger.error(f"[Embed-BG] Critical error at index {index}: {e}")
                    return index, None
        return index, None

    tasks = [_embed(chunk, i) for i, chunk in enumerate(chunks)]
    results = await asyncio.gather(*tasks)
    
    # Sort results by index to maintain order
    results.sort(key=lambda x: x[0])
    return [r[1] for r in results]
