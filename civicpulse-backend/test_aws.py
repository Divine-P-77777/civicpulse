import boto3
import os
from dotenv import load_dotenv
from dotenv import load_dotenv

load_dotenv()

AWS_REGION = os.getenv("AWS_DEFAULT_REGION", "ap-south-1")
BEDROCK_REGION = os.getenv("BEDROCK_REGION", AWS_REGION)

print(f"Testing AWS Connection in {AWS_REGION}...")
print(f"Bedrock Region: {BEDROCK_REGION}")
s3 = boto3.client("s3", region_name=AWS_REGION)
try:
    print("S3 Buckets:", [b['Name'] for b in s3.list_buckets().get('Buckets', [])])
    print("✅ S3 setup successful")
except Exception as e:
    print(f"❌ S3 Error: {e}")

print("\nTesting Bedrock Connection...")
try:
    bedrock = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)
    print("✅ Bedrock setup successful")
except Exception as e:
    print(f"❌ Bedrock Error: {e}")

print("\nAWS setup tests complete.")
