from fastapi import APIRouter, UploadFile
from app.services.s3_service import upload_to_s3, S3_BUCKET

router = APIRouter()

@router.post("/upload")
async def upload_document(file: UploadFile):
    file_key = upload_to_s3(file)
    file_url = f"s3://{S3_BUCKET}/{file_key}"
    return {"message": "Uploaded successfully", "url": file_url}
