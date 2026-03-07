import sys
import os

# Add the backend app to the path so we can import services
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app.services.dynamodb_service import store_analysis_result

def calibrate():
    print("🚀 Calibrating Textract usage tracking...")
    

    pages_to_add = 978 
    
    print(f"Adding {pages_to_add} pages to the current month's Textract quota...")
    
    doc_id = store_analysis_result(
        query="MIGRATION: Pre-tracking usage catch-up",
        summary=f"Manually added historical usage of {pages_to_add} pages to ensure accurate failover gating.",
        pages_processed=pages_to_add,
        ocr_engine="Textract"
    )
    
    if doc_id:
        print(f"✅ Success! Migration record created with ID: {doc_id}")
        print("The system will now correctly see your usage as 978+ pages this month.")
        print("Note: This will naturally be ignored when the next month starts.")
    else:
        print("❌ Failed to create migration record. Check your AWS credentials and DynamoDB connection.")

if __name__ == "__main__":
    calibrate()
