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
    def similarity_search(self, query_vector: list, k: int = 5, user_id: str = None):
        search_query = {
            "size": k,
            "query": {
                "bool": {
                    "must": [
                        {
                            "knn": {
                                "vector": {
                                    "vector": query_vector,
                                    "k": k
                                }
                            }
                        }
                    ],
                    "filter": {
                        "bool": {
                            "should": [
                                {"term": {"metadata.source_type.keyword": "global"}}
                            ]
                        }
                    }
                }
            }
        }
        
        # If user_id is provided, also allow docs where source_type is "private" and uploaded_by == user_id
        if user_id:
            search_query["query"]["bool"]["filter"]["bool"]["should"].append({
                "bool": {
                    "must": [
                        {"term": {"metadata.source_type.keyword": "private"}},
                        {"term": {"metadata.uploaded_by.keyword": user_id}}
                    ]
                }
            })
            
        # Add fallback: allow older docs that lack source_type (treated as global for backwards compatibility)
        search_query["query"]["bool"]["filter"]["bool"]["should"].append({
            "bool": {
                "must_not": {
                    "exists": {
                        "field": "metadata.source_type"
                    }
                }
            }
        })
            
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
        """Get index health, document count, and type distribution."""
        try:
            stats = self.client.indices.stats(index=self.index_name)
            health = self.client.cluster.health(index=self.index_name)
            index_stats = stats["indices"].get(self.index_name, {})
            
            # Get type distribution
            distribution = self.get_document_type_distribution()
            
            return {
                "status": health.get("status", "unknown"),
                "doc_count": index_stats.get("primaries", {}).get("docs", {}).get("count", 0),
                "store_size": index_stats.get("primaries", {}).get("store", {}).get("size_in_bytes", 0),
                "health": health.get("status", "unknown"),
                "type_distribution": distribution
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def get_document_type_distribution(self):
        """Aggregate documents by their metadata.type field."""
        try:
            query = {
                "size": 0,
                "aggs": {
                    "types": {
                        "terms": {
                            "field": "metadata.type.keyword",
                            "size": 10
                        }
                    }
                }
            }
            response = self.client.search(index=self.index_name, body=query)
            buckets = response.get("aggregations", {}).get("types", {}).get("buckets", [])
            
            # Map into recharts expected format {name: 'type', value: count}
            # Fallback to 'unknown' if type is empty/missing
            return [{"name": b["key"] if b["key"] else "unknown", "value": b["doc_count"]} for b in buckets]
        except Exception as e:
            print(f"Error getting document type distribution: {e}")
            return []

# Singleton instance
vector_service = VectorService()

# Backward-compatible function export
def store_vector(doc_id: str, vector: list, metadata: dict):
    return vector_service.store_vector(doc_id, vector, metadata)
