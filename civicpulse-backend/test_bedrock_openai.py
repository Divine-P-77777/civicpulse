import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# The client will automatically pick up OPENAI_API_KEY and OPENAI_BASE_URL from .env
client = OpenAI()

try:
    print("Testing OpenAI-compatible Bedrock Request...")
    # Using Claude 3 Sonnet which we know is on Bedrock
    response = client.chat.completions.create(
        model="anthropic.claude-3-sonnet-20240229-v1:0",
        messages=[
            {"role": "user", "content": "Write a one-sentence bedtime story about a unicorn."}
        ]
    )

    print("✅ Bedrock OpenAI Response Received!")
    print(response.choices[0].message.content)
except Exception as e:
    print(f"❌ Bedrock OpenAI Error: {e}")
