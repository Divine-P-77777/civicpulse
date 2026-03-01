import boto3
from dotenv import load_dotenv

load_dotenv() # Load AWS keys from .env automatically

print("Testing S3 Connection...")
s3 = boto3.client("s3", region_name="ap-south-1")
try:
    print("S3 Buckets:", [b['Name'] for b in s3.list_buckets().get('Buckets', [])])
    print("✅ S3 setup successful")
except Exception as e:
    print(f"❌ S3 Error: {e}")

print("\nTesting Bedrock Connection...")
try:
    bedrock = boto3.client("bedrock-runtime", region_name="ap-south-1")
    print("✅ Bedrock setup successful")
except Exception as e:
    print(f"❌ Bedrock Error: {e}")

print("\nAWS setup tests complete.")
