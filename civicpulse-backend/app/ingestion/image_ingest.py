import google.generativeai as genai
import os
import requests
import uuid
import tempfile
from app.services.vector_service import vector_service
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
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
        vision_model = genai.GenerativeModel('gemini-1.5-pro-latest')
        
        sample_file = genai.upload_file(path=local_path, display_name=os.path.basename(file_key))
        response = vision_model.generate_content([
            sample_file, 
            "Extract all text, concepts, and key information from this image."
        ])
        extracted_text = response.text
        
        # 3. Generate Embeddings (using local or API logic)
        headers = {"Authorization": f"Bearer {os.getenv('HUGGINGFACE_API_KEY')}"}
        payload = {"inputs": extracted_text}
        
        # Retry logic for embeddings
        for _ in range(3):
            res = requests.post(os.getenv("EMBEDDING_API_URL"), headers=headers, json=payload)
            if res.status_code == 200:
                vector = res.json()[0]
                break
        else:
            raise Exception("Failed to generate embedding for image content.")

        # 4. Store in OpenSearch
        doc_id = str(uuid.uuid4())
        doc_meta = {
            **metadata,
            "source": f"s3://{bucket}/{file_key}",
            "type": "image",
            "content": extracted_text
        }
        
        vector_service.store_vector(doc_id, vector, doc_meta)
        return 1 # 1 chunk processed
        
    finally:
        if os.path.exists(local_path):
            os.remove(local_path)
