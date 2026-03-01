import uuid
import os
from fastapi import UploadFile
from app.config import s3_client

S3_BUCKET = os.getenv("S3_BUCKET", "civicpulse-documents")

def upload_to_s3(file: UploadFile) -> str:
    file_id = str(uuid.uuid4())
    file_extension = file.filename.split(".")[-1]
    s3_key = f"uploads/{file_id}.{file_extension}"
    
    s3_client.upload_fileobj(
        file.file,
        S3_BUCKET,
        s3_key,
        ExtraArgs={"ContentType": file.content_type}
    )
    
    return f"s3://{S3_BUCKET}/{s3_key}"
