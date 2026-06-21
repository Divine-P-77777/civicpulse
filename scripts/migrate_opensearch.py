import os
import time
from dotenv import load_dotenv
from opensearchpy import OpenSearch, RequestsHttpConnection, helpers

# Load existing env vars (source credentials)
load_dotenv(dotenv_path="../backend/.env")

# --- Source OpenSearch Configuration ---
SRC_HOST = os.getenv("OPENSEARCH_ENDPOINT", "").replace("https://", "").replace(":443", "").strip()
SRC_USER = os.getenv("OPENSEARCH_USER", "admin").strip()
SRC_PASS = os.getenv("OPENSEARCH_PASSWORD", "").strip()
INDEX_NAME = "civicpulse"

# --- Target OpenSearch Configuration ---
# Provided by user
TGT_HOST = "search-civicpusle-vector-database-mmqrvvk4bferto4pwqesu25ahq.ap-south-1.es.amazonaws.com"
TGT_USER = SRC_USER # User mentioned admin and password will be same as previous
TGT_PASS = SRC_PASS 

print("Connecting to Source OpenSearch...")

src_client = OpenSearch(
    hosts=[{"host": SRC_HOST, "port": 443}],
    http_auth=(SRC_USER, SRC_PASS),
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection,
    timeout=60
)

print("Connecting to Target OpenSearch...")
tgt_client = OpenSearch(
    hosts=[{"host": TGT_HOST, "port": 443}],
    http_auth=(TGT_USER, TGT_PASS),
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection,
    timeout=60
)

def create_target_index():
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
    
    if tgt_client.indices.exists(index=INDEX_NAME):
        print(f"Target index '{INDEX_NAME}' already exists. Skipping creation.")
    else:
        print(f"Creating index '{INDEX_NAME}' on Target OpenSearch...")
        tgt_client.indices.create(index=INDEX_NAME, body=index_body)
        print("Target index created successfully.")

def migrate_data():
    print(f"Starting data migration from Source to Target for index '{INDEX_NAME}'...")
    
    # Refresh source index to ensure we get accurate counts
    src_client.indices.refresh(index=INDEX_NAME)
    src_count = src_client.count(index=INDEX_NAME)['count']
    print(f"Total documents to migrate: {src_count}")
    
    # Use scan to efficiently iterate over all documents in source
    query = {"query": {"match_all": {}}}
    
    # Generator for bulk indexing
    def doc_generator():
        for doc in helpers.scan(src_client, query=query, index=INDEX_NAME, scroll='5m'):
            yield {
                "_index": INDEX_NAME,
                "_id": doc["_id"],
                "_source": doc["_source"]
            }
            
    # Execute bulk indexing on target
    success, failed = helpers.bulk(
        tgt_client, 
        doc_generator(), 
        chunk_size=500, 
        stats_only=True,
        raise_on_error=False,
        raise_on_exception=False
    )
    
    print(f"Migration completed. Successfully indexed: {success}, Failed: {len(failed) if isinstance(failed, list) else failed}")
    
    # Refresh target index
    time.sleep(2) # Give it a moment before refresh
    tgt_client.indices.refresh(index=INDEX_NAME)
    tgt_count = tgt_client.count(index=INDEX_NAME)['count']
    print(f"Verification: Target document count is now {tgt_count}")
    
    if tgt_count == src_count:
        print("Migration verified: Document counts match perfectly.")
    else:
        print(f"Warning: Document counts differ (Source: {src_count}, Target: {tgt_count}).")
        
if __name__ == "__main__":
    create_target_index()
    migrate_data()
