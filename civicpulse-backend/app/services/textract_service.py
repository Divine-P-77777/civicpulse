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
    """
    Poll for Textract job completion and return the full extracted text.
    Handles pagination via NextToken for large documents (50+ pages).
    """
    while True:
        response = textract_client.get_document_text_detection(JobId=job_id)
        status = response["JobStatus"]
        if status == "SUCCEEDED":
            break
        elif status == "FAILED":
            raise Exception(f"Textract job {job_id} failed.")
        else:
            print(f"Textract Job {job_id} status: {status}. Waiting...")
            time.sleep(3)
    
    # Collect text from ALL pages using NextToken pagination
    full_text = ""
    next_token = None
    page_count = 0
    
    while True:
        kwargs = {"JobId": job_id}
        if next_token:
            kwargs["NextToken"] = next_token
        
        response = textract_client.get_document_text_detection(**kwargs)
        page_count += 1
        
        for block in response.get("Blocks", []):
            if block["BlockType"] == "LINE":
                full_text += block["Text"] + "\n"
        
        next_token = response.get("NextToken")
        if not next_token:
            break
    
    print(f"✅ Textract extraction complete: {page_count} result pages, {len(full_text)} characters")
    return full_text
