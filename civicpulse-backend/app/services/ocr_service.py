import pytesseract
import pdfplumber
from pdf2image import convert_from_path
import os
import logging

logger = logging.getLogger(__name__)

def extract_text_local(file_path: str):
    """
    Local OCR and Text Extraction service.
    - PDFs: Tries digital extraction via pdfplumber first. Falls back to OCR.
    - Images: Uses Pytesseract directly.
    """
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == '.pdf':
        return _extract_from_pdf(file_path)
    else:
        return _extract_from_image(file_path)

def _extract_from_pdf(pdf_path: str):
    """
    Hybrid PDF extraction: 
    1. Direct text extraction (free and fast)
    2. OCR for pages that have no text (embedded images)
    """
    full_text = ""
    pages_processed = 0
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            pages_processed = len(pdf.pages)
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text and text.strip():
                    full_text += text + "\n"
                else:
                    # Page seems to be an image, use OCR
                    logger.info(f"Page {i+1} of {pdf_path} appears to be an image. Using OCR...")
                    page_image = page.to_image(resolution=200).original
                    full_text += pytesseract.image_to_string(page_image) + "\n"
                    
        return full_text, pages_processed
    except Exception as e:
        logger.error(f"Error in local PDF extraction: {e}")
        # Fallback to pure OCR if pdfplumber fails
        return _extract_via_ocr_fallback(pdf_path)

def _extract_via_ocr_fallback(pdf_path: str):
    """Converts PDF to images and uses pytesseract on each page."""
    try:
        images = convert_from_path(pdf_path)
        full_text = ""
        for img in images:
            full_text += pytesseract.image_to_string(img) + "\n"
        return full_text, len(images)
    except Exception as e:
        logger.error(f"OCR Fallback failed: {e}")
        return "", 0

def _extract_from_image(image_path: str):
    """Direct image OCR."""
    try:
        text = pytesseract.image_to_string(image_path)
        return text, 1
    except Exception as e:
        logger.error(f"Error in local image OCR: {e}")
        return "", 0
