import os
from opensearchpy import OpenSearch, RequestsHttpConnection

client = OpenSearch(
    hosts=[{"host": os.getenv("OPENSEARCH_ENDPOINT", "YOUR_OPENSEARCH_ENDPOINT"), "port": 443}],
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection
)

def store_vector(doc_id: str, vector: list, metadata: dict):
    body = {
        "vector": vector,
        "metadata": metadata
    }
    client.index(index="civicpulse", id=doc_id, body=body)

def similarity_search(query_vector: list):
    search_query = {
        "size": 5,
        "query": {
            "knn": {
                "vector": {
                    "vector": query_vector,
                    "k": 5
                }
            }
        }
    }
    response = client.search(index="civicpulse", body=search_query)
    return [hit["_source"] for hit in response["hits"]["hits"]]
