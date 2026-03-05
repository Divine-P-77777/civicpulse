import uuid
import os
from fastapi import UploadFile
from app.config import s3_client

S3_BUCKET = os.getenv("S3_BUCKET", "civicpulse-documents-bucket")

# --- CREATE ---
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
    
    return s3_key

# --- READ ---
def list_files(prefix: str = "uploads/"):
    """List all files in the S3 bucket under a given prefix."""
    response = s3_client.list_objects_v2(Bucket=S3_BUCKET, Prefix=prefix)
    files = []
    for obj in response.get("Contents", []):
        files.append({
            "key": obj["Key"],
            "size": obj["Size"],
            "last_modified": obj["LastModified"].isoformat(),
        })
    return {"files": files, "count": len(files)}

def get_presigned_url(key: str, expires_in: int = 3600):
    """Generate a presigned download URL for a file."""
    url = s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": S3_BUCKET, "Key": key},
        ExpiresIn=expires_in
    )
    return {"url": url, "expires_in": expires_in}

# --- DELETE ---
def delete_file(key: str):
    """Delete a file from S3."""
    s3_client.delete_object(Bucket=S3_BUCKET, Key=key)
    return {"deleted": True, "key": key}
