import time
from app.config import textract_client

def extract_text_from_s3(bucket: str, key: str):
    response = textract_client.start_document_text_detection(
        DocumentLocation={
            "S3Object": {
                "Bucket": bucket,
                "Name": key
            }
        }
    )
    return response["JobId"]

def get_text_from_job(job_id: str):
    """Poll for Textract job completion and return the full extracted text."""
    while True:
        response = textract_client.get_document_text_detection(JobId=job_id)
        status = response["JobStatus"]
        if status == "SUCCEEDED":
            text = ""
            for block in response["Blocks"]:
                if block["BlockType"] == "LINE":
                    text += block["Text"] + "\n"
            return text
        elif status == "FAILED":
            raise Exception(f"Textract job {job_id} failed.")
        else:
            print(f"Textract Job {job_id} status: {status}. Waiting...")
            time.sleep(2)
