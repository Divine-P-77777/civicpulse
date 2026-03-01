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
            connection_class=RequestsHttpConnection
        )
        self.index_name = "civicpulse"

    def store_vector(self, doc_id: str, vector: list, metadata: dict):
        body = {
            "vector": vector,
            "metadata": metadata
        }
        return self.client.index(index=self.index_name, id=doc_id, body=body)

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

# Singleton instance
vector_service = VectorService()
