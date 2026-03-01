import os
from opensearchpy import OpenSearch, RequestsHttpConnection
from dotenv import load_dotenv

load_dotenv()

host = os.getenv("OPENSEARCH_ENDPOINT", "YOUR_ENDPOINT").replace("https://", "")
username = os.getenv("OPENSEARCH_USER", "admin")
password = os.getenv("OPENSEARCH_PASSWORD", "YOUR_PASSWORD")

print(f"Testing connection to OpenSearch: {host}")

try:
    client = OpenSearch(
        hosts=[{'host': host, 'port': 443}],
        http_auth=(username, password),
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection
    )

    info = client.info()
    print("✅ OpenSearch connection successful!")
    print(f"Cluster Name: {info['cluster_name']}")
    print(f"Version: {info['version']['number']}")
except Exception as e:
    print(f"❌ OpenSearch Error: {e}")
