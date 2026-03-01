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
    return response

def get_textract_results(job_id: str):
    response = textract_client.get_document_text_detection(JobId=job_id)
    return response
