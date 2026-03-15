import boto3
import os
from botocore.config import Config
from dotenv import load_dotenv

load_dotenv()

AWS_REGION = os.getenv("AWS_DEFAULT_REGION", "ap-south-1")
BEDROCK_REGION = os.getenv("BEDROCK_REGION", AWS_REGION)

# Adaptive retry: automatically uses exponential backoff + jitter on throttling
bedrock_config = Config(
    retries={"max_attempts": 8, "mode": "adaptive"},
    read_timeout=120,
    connect_timeout=10,
    max_pool_connections=50,  # Support more parallel ingestion + chat
    tcp_keepalive=True,        # Better stability for long-lived connections
)

s3_client = boto3.client("s3", region_name=AWS_REGION, config=bedrock_config)
textract_client = boto3.client("textract", region_name=AWS_REGION, config=bedrock_config)
bedrock_client = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION, config=bedrock_config)

