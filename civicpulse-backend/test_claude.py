import boto3
import json
from dotenv import load_dotenv

load_dotenv()

client = boto3.client("bedrock-runtime", region_name="ap-south-1")

try:
    response = client.invoke_model(
        modelId="anthropic.claude-3-sonnet-20240229-v1:0",
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 200,
            "messages": [
                {
                    "role": "user",
                    "content": "Explain what an unfair rental clause is in one short sentence."
                }
            ]
        })
    )

    response_body = json.loads(response.get("body").read())
    print("✅ Claude invocation successful!")
    print("Response:")
    print(response_body["content"][0]["text"])
except Exception as e:
    print(f"❌ Claude Invocation Error: {e}")
