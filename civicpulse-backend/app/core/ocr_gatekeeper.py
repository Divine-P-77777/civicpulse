from app.services.dynamodb_service import get_monthly_usage
import os
import logging

logger = logging.getLogger(__name__)

# Threshold for switching to local OCR (in pages)
TEXTRACT_THRESHOLD = int(os.getenv("TEXTRACT_MONTHLY_LIMIT", "900"))

def should_use_local_ocr():
    """
    Checks if Textract usage has exceeded the threshold.
    Also respects a manual override if 'FORCE_LOCAL_OCR' is set to 'true'.
    """
    if os.getenv("FORCE_LOCAL_OCR", "false").lower() == "true":
        logger.info("Local OCR forced via configuration.")
        return True
        
    usage = get_monthly_usage()
    logger.info(f"Current monthly Textract usage: {usage} pages. Threshold: {TEXTRACT_THRESHOLD}")
    
    return usage >= TEXTRACT_THRESHOLD
