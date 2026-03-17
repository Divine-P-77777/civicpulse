import os
import logging
import cohere

logger = logging.getLogger(__name__)

class RerankService:
    def __init__(self):
        cohere_key = os.getenv("COHERE_API_KEY")
        self.co_client = cohere.Client(cohere_key) if cohere_key else None
        if not self.co_client:
            logger.warning("COHERE_API_KEY not found. Reranking will be disabled.")

    def rerank_chunks(self, query: str, chunks: list, top_k: int) -> list:
        """
        Uses Cohere Rerank to re-order chunks by relevance.
        Falls back to original order if API fails or is exhausted.
        """
        if not self.co_client or not chunks:
            return chunks[:top_k]

        try:
            # Prepare documents for Cohere
            documents = [c.get("text", "") for c in chunks]
            
            # Call Cohere Rerank (Multilingual 3.0 is excellent for legal/mixed lang)
            results = self.co_client.rerank(
                model="rerank-multilingual-v3.0",
                query=query,
                documents=documents,
                top_n=top_k
            )

            # Reconstruct the ranked chunks list
            reranked = []
            for result in results.results:
                reranked.append(chunks[result.index])
            
            logger.info(f"Cohere Rerank: Re-ordered {len(chunks)} chunks down to {len(reranked)}")
            return reranked

        except Exception as e:
            # Handle rate limits, network errors, etc. without crashing the pipeline
            err_msg = str(e).lower()
            if "status_code: 429" in err_msg or "too many requests" in err_msg:
                logger.warning("[Cohere] Trial key rate limit/quota reached. Falling back to simple vector order.")
            else:
                logger.error(f"[Cohere] Reranking failed: {e}. Falling back to original results.")
            
            return chunks[:top_k]

# Singleton instance
rerank_service = RerankService()
