import uuid
import os
from fastapi import UploadFile
from app.config import s3_client

S3_BUCKET = os.getenv("S3_BUCKET", "civicpulse-documents-bucket")

# --- CREATE ---
def upload_to_s3(file: UploadFile, tags: dict = None) -> str:
    file_id = str(uuid.uuid4())
    file_extension = file.filename.split(".")[-1]
    s3_key = f"uploads/{file_id}.{file_extension}"
    
    extra_args = {"ContentType": file.content_type}
    if tags:
        # Convert tags dict to URL-encoded query string format for Tagging parameter
        tag_str = "&".join([f"{k}={v}" for k, v in tags.items()])
        extra_args["Tagging"] = tag_str

    s3_client.upload_fileobj(
        file.file,
        S3_BUCKET,
        s3_key,
        ExtraArgs=extra_args
    )
    
    return s3_key

def upload_bytes_to_s3(content: bytes, filename: str, content_type: str = "application/octet-stream", tags: dict = None) -> str:
    """Uploads raw bytes to S3 and returns the key."""
    import io
    file_id = str(uuid.uuid4())
    file_extension = filename.split(".")[-1] if "." in filename else "bin"
    s3_key = f"uploads/{file_id}.{file_extension}"
    
    extra_args = {"ContentType": content_type}
    if tags:
        tag_str = "&".join([f"{k}={v}" for k, v in tags.items()])
        extra_args["Tagging"] = tag_str

    s3_client.upload_fileobj(
        io.BytesIO(content),
        S3_BUCKET,
        s3_key,
        ExtraArgs=extra_args
    )
    
    return s3_key

# --- READ ---
def list_files(prefix: str = "uploads/"):
    """List all files in the S3 bucket under a given prefix."""
    response = s3_client.list_objects_v2(Bucket=S3_BUCKET, Prefix=prefix)
    files = []
    for obj in response.get("Contents", []):
        # Fetch tagging for each file
        tags = get_file_tags(obj["Key"])
        files.append({
            "key": obj["Key"],
            "size": obj["Size"],
            "last_modified": obj["LastModified"].isoformat(),
            "tags": tags
        })
    return {"files": files, "count": len(files)}

def get_file_tags(key: str) -> dict:
    """Retrieve tags for an S3 object."""
    try:
        response = s3_client.get_object_tagging(Bucket=S3_BUCKET, Key=key)
        return {tag['Key']: tag['Value'] for tag in response.get('TagSet', [])}
    except Exception as e:
        print(f"Failed to get tags for {key}: {e}")
        return {}

def set_file_tags(key: str, tags: dict):
    """Set tags for an S3 object."""
    try:
        tag_set = [{'Key': k, 'Value': v} for k, v in tags.items()]
        s3_client.put_object_tagging(
            Bucket=S3_BUCKET,
            Key=key,
            Tagging={'TagSet': tag_set}
        )
        return True
    except Exception as e:
        print(f"Failed to set tags for {key}: {e}")
        return False

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
