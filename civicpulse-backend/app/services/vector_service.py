import os
from opensearchpy import OpenSearch, RequestsHttpConnection
from dotenv import load_dotenv

load_dotenv()

host = os.getenv("OPENSEARCH_ENDPOINT", "").replace("https://", "").replace(":443", "")
username = os.getenv("OPENSEARCH_USER", "admin")
password = os.getenv("OPENSEARCH_PASSWORD", "")

client = OpenSearch(
    hosts=[{"host": host, "port": 443}],
    http_auth=(username, password),
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
