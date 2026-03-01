import os
import boto3
from dotenv import load_dotenv
from app.ingestion.pdf_ingest import ingest_pdf_from_s3

load_dotenv()

bucket_name = "civicpulse-documents-bucket"

def run_test():
    # 1. Check if we have files in S3
    s3 = boto3.client("s3")
    try:
        response = s3.list_objects_v2(Bucket=bucket_name)
        files = response.get("Contents", [])
        if not files:
            print(f"❌ No files found in {bucket_name}. Please upload a PDF first.")
            return
        
        # 2. Pick the first file
        target_file = files[0]["Key"]
        print(f"Found file in S3: {target_file}")
        
        # 3. Test Ingestion
        metadata = {"type": "test_document", "region": "Assam"}
        num_chunks = ingest_pdf_from_s3(bucket_name, target_file, metadata)
        print(f"✅ Success! Ingested {num_chunks} chunks.")
        
    except Exception as e:
        print(f"❌ Ingestion Test Failed: {e}")

if __name__ == "__main__":
    run_test()
