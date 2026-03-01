import os
import time
from opensearchpy import OpenSearch, RequestsHttpConnection
from dotenv import load_dotenv

load_dotenv()

host = os.getenv("OPENSEARCH_ENDPOINT", "").replace("https://", "").replace(":443", "")
username = os.getenv("OPENSEARCH_USER", "admin")
password = os.getenv("OPENSEARCH_PASSWORD", "")

client = OpenSearch(
    hosts=[{'host': host, 'port': 443}],
    http_auth=(username, password),
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection
)

index_name = "civicpulse"

index_body = {
    "settings": {
        "index": {
            "knn": True,
            "knn.algo_param.ef_search": 100
        }
    },
    "mappings": {
        "properties": {
            "vector": {
                "type": "knn_vector",
                "dimension": 1536,
                "method": {
                    "name": "hnsw",
                    "space_type": "l2",
                    "engine": "lucene",
                    "parameters": {
                        "ef_construction": 128,
                        "m": 24
                    }
                }
            },
            "metadata": {
                "type": "object"
            }
        }
    }
}

try:
    if client.indices.exists(index=index_name):
        print(f"Index {index_name} already exists. Deleting...")
        client.indices.delete(index=index_name)
    
    print(f"Creating index {index_name}...")
    client.indices.create(index=index_name, body=index_body)
    print("✅ Index created successfully!")
except Exception as e:
    print(f"❌ Error creating index: {e}")
