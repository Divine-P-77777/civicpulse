import json
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.config import bedrock_client

def chunk_text(text: str):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100
    )
    return splitter.split_text(text)

def generate_embedding(text: str):
    response = bedrock_client.invoke_model(
        modelId="amazon.titan-embed-text-v1",
        body=json.dumps({"inputText": text})
    )
    response_body = json.loads(response.get("body").read())
    return response_body.get("embedding")
