import os
from opensearchpy import OpenSearch, RequestsHttpConnection
from dotenv import load_dotenv

load_dotenv()

class VectorService:
    def __init__(self):
        self.host = os.getenv("OPENSEARCH_ENDPOINT", "").replace("https://", "").replace(":443", "")
        self.username = os.getenv("OPENSEARCH_USER", "admin")
        self.password = os.getenv("OPENSEARCH_PASSWORD", "")
        
        self.client = OpenSearch(
            hosts=[{"host": self.host, "port": 443}],
            http_auth=(self.username, self.password),
            use_ssl=True,
            verify_certs=True,
            connection_class=RequestsHttpConnection,
            timeout=30
        )
        self.index_name = "civicpulse"

    # --- CREATE ---
    def store_vector(self, doc_id: str, vector: list, metadata: dict):
        body = {
            "vector": vector,
            "metadata": metadata
        }
        return self.client.index(index=self.index_name, id=doc_id, body=body)

    # --- READ ---
    def similarity_search(self, query_vector: list, k: int = 5):
        search_query = {
            "size": k,
            "query": {
                "knn": {
                    "vector": {
                        "vector": query_vector,
                        "k": k
                    }
                }
            }
        }
        response = self.client.search(index=self.index_name, body=search_query)
        return [hit["_source"]["metadata"] for hit in response["hits"]["hits"]]

    def list_documents(self, page: int = 0, size: int = 20):
        """List all indexed documents with pagination."""
        search_query = {
            "size": size,
            "from": page * size,
            "query": {"match_all": {}},
            "_source": ["metadata"]
        }
        response = self.client.search(index=self.index_name, body=search_query)
        total = response["hits"]["total"]["value"]
        docs = [
            {"id": hit["_id"], "metadata": hit["_source"].get("metadata", {})}
            for hit in response["hits"]["hits"]
        ]
        return {"total": total, "page": page, "size": size, "documents": docs}

    def get_document(self, doc_id: str):
        """Get a single document by ID."""
        try:
            result = self.client.get(index=self.index_name, id=doc_id)
            return {
                "id": result["_id"],
                "metadata": result["_source"].get("metadata", {}),
                "found": True
            }
        except Exception:
            return {"found": False}

    # --- DELETE ---
    def delete_document(self, doc_id: str):
        """Delete a single document by ID."""
        try:
            self.client.delete(index=self.index_name, id=doc_id)
            return {"deleted": True}
        except Exception as e:
            return {"deleted": False, "error": str(e)}

    def delete_all_documents(self):
        """Purge all documents from the index."""
        result = self.client.delete_by_query(
            index=self.index_name,
            body={"query": {"match_all": {}}}
        )
        return {"deleted": result.get("deleted", 0)}

    # --- STATS ---
    def get_index_stats(self):
        """Get index health and document count."""
        try:
            stats = self.client.indices.stats(index=self.index_name)
            health = self.client.cluster.health(index=self.index_name)
            index_stats = stats["indices"].get(self.index_name, {})
            return {
                "status": health.get("status", "unknown"),
                "doc_count": index_stats.get("primaries", {}).get("docs", {}).get("count", 0),
                "store_size": index_stats.get("primaries", {}).get("store", {}).get("size_in_bytes", 0),
                "health": health.get("status", "unknown")
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}

# Singleton instance
vector_service = VectorService()

# Backward-compatible function export
def store_vector(doc_id: str, vector: list, metadata: dict):
    return vector_service.store_vector(doc_id, vector, metadata)
