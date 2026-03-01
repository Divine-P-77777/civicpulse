import json
from app.config import bedrock_client
from app.services.embedding_service import generate_embedding
from app.services.vector_service import similarity_search
from app.services.dynamodb_service import store_analysis_result

import os

def analyze_document(query: str):
    query_embedding = generate_embedding(query)
    context_chunks = similarity_search(query_embedding)

    prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "system_prompt.txt")
    with open(prompt_path, "r") as f:
        prompt_template = f.read()

    final_prompt = prompt_template.format(
        context=json.dumps(context_chunks),
        query=query
    )

    response = bedrock_client.invoke_model(
        modelId="anthropic.claude-3-sonnet-20240229-v1:0",
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "messages": [{"role": "user", "content": final_prompt}]
        })
    )
    
    response_body = json.loads(response.get("body").read())
    result_text = response_body["content"][0]["text"]
    
    # Store results in DynamoDB for dashboard rendering
    store_analysis_result(query, result_text)
    
    return result_text
