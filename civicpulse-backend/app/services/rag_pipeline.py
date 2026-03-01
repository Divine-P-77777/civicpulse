import os
import json
from openai import OpenAI
from app.services.embedding_service import generate_embedding
from app.services.vector_service import similarity_search
from app.services.dynamodb_service import store_analysis_result

client = OpenAI()

def analyze_document(query: str):
    query_embedding = generate_embedding(query)
    context_chunks = similarity_search(query_embedding)

    prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "system_prompt.txt")
    with open(prompt_path, "r") as f:
        prompt_template = f.read()

    # Format context as a string
    context_str = "\n".join([c.get("text", "") for c in context_chunks])

    final_prompt = prompt_template.format(
        context=context_str,
        query=query
    )

    response = client.chat.completions.create(
        model="openai.gpt-oss-120b",
        messages=[{"role": "user", "content": final_prompt}]
    )
    
    result_text = response.choices[0].message.content
    
    # Store results in DynamoDB (surrounded by try-except in service)
    store_analysis_result(query, result_text)
    
    return result_text
