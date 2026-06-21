import os
import json
import time
from dotenv import load_dotenv
from opensearchpy import OpenSearch, RequestsHttpConnection, helpers
import boto3

# Load env
import pathlib
env_path = pathlib.Path(__file__).parent.parent / "backend" / ".env"
load_dotenv(dotenv_path=env_path)

# Connect to Bedrock for Titan V2
BEDROCK_REGION = os.getenv("BEDROCK_REGION", "us-east-1")
bedrock_client = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)

# Connect to OpenSearch
host = os.getenv("OPENSEARCH_ENDPOINT", "").replace("https://", "").replace(":443", "").strip()
username = os.getenv("OPENSEARCH_USER", "admin")
password = os.getenv("OPENSEARCH_PASSWORD", "")

client = OpenSearch(
    hosts=[{'host': host, 'port': 443}],
    http_auth=(username, password),
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection
)

SRC_INDEX = "civicpulse"
TGT_INDEX = "civicpulse_v2"

def generate_v2_embedding(text):
    """Generate 1024D embedding using Titan V2"""
    for attempt in range(5):
        try:
            response = bedrock_client.invoke_model(
                modelId="amazon.titan-embed-text-v2:0",
                body=json.dumps({"inputText": text, "dimensions": 1024, "normalize": True})
            )
            response_body = json.loads(response.get("body").read())
            return response_body.get("embedding")
        except Exception as e:
            if attempt == 4:
                raise e
            print(f"Throttled by Bedrock, retrying in {2**attempt}s... ({str(e)})")
            time.sleep(2**attempt)

def run_migration():
    if not client.indices.exists(index=SRC_INDEX):
        print(f"Source index '{SRC_INDEX}' does not exist!")
        return

    # Call setup script to ensure target index exists with 1024D mapping
    print(f"Ensuring target index '{TGT_INDEX}' exists...")
    import sys
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
    import app.services.setup_opensearch as setup_os
    
    # Check count in source
    src_count = client.count(index=SRC_INDEX)['count']
    print(f"Total documents to re-embed and migrate: {src_count}")
    
    if src_count == 0:
        print("No documents found in source index. Exiting.")
        return

    # Use scan to stream documents
    query = {"query": {"match_all": {}}}
    scan_gen = helpers.scan(
        client,
        query=query,
        index=SRC_INDEX,
        scroll="5m",
        size=100
    )

    actions = []
    processed = 0
    failed = 0

    print("Starting re-embedding process... This may take a while depending on AWS rate limits.")
    for hit in scan_gen:
        doc_id = hit["_id"]
        source = hit["_source"]
        
        text = source.get("metadata", {}).get("text", "")
        if not text:
            # Fallback in case it's stored at the root level
            text = source.get("text", "")
            if not text:
                failed += 1
                continue

        
        try:
            # Generate new 1024D vector
            new_vector = generate_v2_embedding(text)
            
            # Prepare new document action
            action = {
                "_index": TGT_INDEX,
                "_id": doc_id,
                "_source": {
                    "text": text,
                    "vector": new_vector,
                    "metadata": source.get("metadata", {})
                }
            }
            actions.append(action)
            processed += 1
            
            # Batch size of 50 to respect rate limits and memory
            if len(actions) >= 50:
                helpers.bulk(client, actions)
                print(f"Processed and indexed {processed}/{src_count} documents...")
                actions = []
                
        except Exception as e:
            print(f"Failed to re-embed doc {doc_id}: {e}")
            failed += 1

    # Index remaining documents
    if actions:
        helpers.bulk(client, actions)
        print(f"Processed and indexed {processed}/{src_count} documents...")

    print(f"\nMigration completed! Successfully re-embedded: {processed}, Failed: {failed}")
    
    # Verify
    time.sleep(2)
    client.indices.refresh(index=TGT_INDEX)
    tgt_count = client.count(index=TGT_INDEX)['count']
    print(f"Target index '{TGT_INDEX}' now has {tgt_count} documents.")

if __name__ == "__main__":
    run_migration()
