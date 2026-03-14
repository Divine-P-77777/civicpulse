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
)

s3_client = boto3.client("s3", region_name=AWS_REGION)
textract_client = boto3.client("textract", region_name=AWS_REGION)
bedrock_client = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION, config=bedrock_config)

