import os
from opensearchpy import OpenSearch, RequestsHttpConnection
from dotenv import load_dotenv
import json

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

def view_chunks():
    print(f"Fetching chunks from index: {index_name}...\n")
    
    query = {
        "size": 10,  # Show first 10 chunks
        "query": {
            "match_all": {}
        }
    }
    
    try:
        response = client.search(index=index_name, body=query)
        hits = response['hits']['hits']
        
        if not hits:
            print("No chunks found in the index.")
            return

        for i, hit in enumerate(hits):
            source = hit['_source']
            metadata = source.get('metadata', {})
            text = metadata.get('text', 'No text field found')
            
            print(f"--- CHUNK {i+1} ---")
            print(f"Source: {metadata.get('source')}")
            print(f"Index: {metadata.get('chunk_index')}")
            print(f"Content Preview: {text[:200]}...") 
            print("-" * 20 + "\n")
            
    except Exception as e:
        print(f"❌ Error fetching chunks: {e}")

if __name__ == "__main__":
    view_chunks()
