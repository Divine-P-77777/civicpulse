import boto3
import json
from dotenv import load_dotenv

load_dotenv()

client = boto3.client("bedrock-runtime", region_name="ap-south-1")

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
