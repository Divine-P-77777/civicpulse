from fastapi import APIRouter, UploadFile
from app.services.s3_service import upload_to_s3

router = APIRouter()

@router.post("/upload")
async def upload_document(file: UploadFile):
    file_url = upload_to_s3(file)
    return {"message": "Uploaded successfully", "url": file_url}
