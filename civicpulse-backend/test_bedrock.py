import boto3
import os
import json
from dotenv import load_dotenv

load_dotenv()

bedrock_region = os.getenv("BEDROCK_REGION", "ap-south-1")
client = boto3.client("bedrock-runtime", region_name=bedrock_region)

try:
    response = client.invoke_model(
        modelId="amazon.titan-embed-text-v1",
        body=json.dumps({
            "inputText": "This rental agreement requires tenant to pay all repair costs."
        })
    )
    
    # Read response body
    response_body = json.loads(response.get("body").read())
    print("✅ Embedding call successful!")
    print(f"Embedding length: {len(response_body.get('embedding', []))}")
except Exception as e:
    print(f"❌ Bedrock Embedding Error: {e}")
