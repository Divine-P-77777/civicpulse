import pytesseract
import pdfplumber
from pdf2image import convert_from_path
import os
import logging
from typing import Optional, Callable, Awaitable

logger = logging.getLogger(__name__)


async def extract_text_local_async(
    file_path: str,
    on_page_progress: Optional[Callable[[int, int], Awaitable[None]]] = None
) -> tuple[str, int]:
    """
    Local OCR and Text Extraction with per-page progress callbacks.
    
    Args:
        file_path: Path to the PDF or image file.
        on_page_progress: Optional async callback(current_page, total_pages).
    
    Returns:
        (full_text, pages_processed) tuple.
    """
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == '.pdf':
        return await _extract_from_pdf_async(file_path, on_page_progress)
    else:
        return await _extract_from_image_async(file_path, on_page_progress)


async def _extract_from_pdf_async(
    pdf_path: str,
    on_page_progress: Optional[Callable[[int, int], Awaitable[None]]] = None
) -> tuple[str, int]:
    """
    Hybrid PDF extraction with per-page progress:
    1. Direct text extraction (fast) 
    2. OCR for pages that have no text (embedded images)
    """
    import asyncio
    full_text = ""
    pages_processed = 0
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            pages_processed = total_pages
            
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text and text.strip():
                    full_text += text + "\n"
                else:
                    # Page seems to be an image, use OCR
                    logger.info(f"Page {i+1}/{total_pages} of {pdf_path} appears to be an image. Using OCR...")
                    page_image = page.to_image(resolution=200).original
                    ocr_text = await asyncio.to_thread(pytesseract.image_to_string, page_image)
                    full_text += ocr_text + "\n"
                
                # Emit per-page progress
                if on_page_progress:
                    await on_page_progress(i + 1, total_pages)
                    
        return full_text, pages_processed
    except Exception as e:
        logger.error(f"Error in local PDF extraction: {e}")
        return await _extract_via_ocr_fallback_async(pdf_path, on_page_progress)


async def _extract_via_ocr_fallback_async(
    pdf_path: str,
    on_page_progress: Optional[Callable[[int, int], Awaitable[None]]] = None
) -> tuple[str, int]:
    """Converts PDF to images and uses pytesseract on each page."""
    import asyncio
    try:
        images = await asyncio.to_thread(convert_from_path, pdf_path)
        full_text = ""
        total = len(images)
        for i, img in enumerate(images):
            ocr_text = await asyncio.to_thread(pytesseract.image_to_string, img)
            full_text += ocr_text + "\n"
            if on_page_progress:
                await on_page_progress(i + 1, total)
        return full_text, total
    except Exception as e:
        logger.error(f"OCR Fallback failed: {e}")
        return "", 0


async def _extract_from_image_async(
    image_path: str,
    on_page_progress: Optional[Callable[[int, int], Awaitable[None]]] = None
) -> tuple[str, int]:
    """Direct image OCR."""
    import asyncio
    try:
        text = await asyncio.to_thread(pytesseract.image_to_string, image_path)
        if on_page_progress:
            await on_page_progress(1, 1)
        return text, 1
    except Exception as e:
        logger.error(f"Error in local image OCR: {e}")
        return "", 0


# ─── Legacy sync wrappers (backward compatibility) ───

def extract_text_local(file_path: str):
    """Legacy sync version. Prefer extract_text_local_async for new code."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.pdf':
        return _extract_from_pdf(file_path)
    else:
        return _extract_from_image(file_path)

def _extract_from_pdf(pdf_path: str):
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
                    logger.info(f"Page {i+1} of {pdf_path} appears to be an image. Using OCR...")
                    page_image = page.to_image(resolution=200).original
                    full_text += pytesseract.image_to_string(page_image) + "\n"
        return full_text, pages_processed
    except Exception as e:
        logger.error(f"Error in local PDF extraction: {e}")
        return _extract_via_ocr_fallback(pdf_path)

def _extract_via_ocr_fallback(pdf_path: str):
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
    try:
        text = pytesseract.image_to_string(image_path)
        return text, 1
    except Exception as e:
        logger.error(f"Error in local image OCR: {e}")
        return "", 0
