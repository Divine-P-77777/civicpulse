from google import genai
import os
import uuid
import tempfile
from app.services.vector_service import vector_service
from app.services.embedding_service import generate_embedding
from app.services.s3_service import s3_client

async def ingest_image_from_s3(bucket: str, file_key: str, metadata: dict = {}):
    """
    Downloads image from S3, uses Gemini Vision to extract text/entities,
    and then generates vector embeddings to store in OpenSearch.
    """
    # 1. Download from S3 temporarily
    local_path = os.path.join(tempfile.gettempdir(), os.path.basename(file_key))
    s3_client.download_file(bucket, file_key, local_path)

    try:
        # 2. Extract with Gemini
        client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
        
        sample_file = client.files.upload(file=local_path, config={"display_name": os.path.basename(file_key)})
        response = client.models.generate_content(
            model='gemini-1.5-pro-latest',
            contents=[
                sample_file, 
                "Extract all text, concepts, and key information from this image."
            ]
        )
        extracted_text = response.text
        
        # 3. Generate Embedding using Bedrock (Titan)
        vector = generate_embedding(extracted_text[:8000])

        # 4. Store in OpenSearch
        doc_id = str(uuid.uuid4())
        doc_meta = {
            **metadata,
            "source": f"s3://{bucket}/{file_key}",
            "type": "image",
            "content": extracted_text
        }
        
        vector_service.store_vector(doc_id, vector, doc_meta)
        return 1  # 1 chunk processed
        
    finally:
        if os.path.exists(local_path):
            os.remove(local_path)

