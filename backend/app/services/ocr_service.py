import os
import shutil
import hashlib
import logging
from typing import List, Dict, Any, Optional
from PIL import Image
try:
    import pymupdf as fitz
except ImportError:
    import fitz
import pytesseract
from app.core.config import settings

logger = logging.getLogger("myclinix.ocr")

# Configure Tesseract binary path
TESSERACT_CANDIDATES = [
    getattr(settings, "TESSERACT_CMD", None),
    os.getenv("TESSERACT_CMD"),
    shutil.which("tesseract"),
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    "/usr/bin/tesseract",
    "/usr/local/bin/tesseract",
]

_tesseract_configured = False
_tesseract_available = False

def init_tesseract() -> bool:
    global _tesseract_configured, _tesseract_available
    if _tesseract_configured:
        return _tesseract_available

    for candidate in TESSERACT_CANDIDATES:
        if candidate and os.path.exists(candidate):
            pytesseract.pytesseract.tesseract_cmd = candidate
            _tesseract_available = True
            logger.info(f"Tesseract OCR engine configured at: {candidate}")
            break

    if not _tesseract_available:
        # Check if tesseract command works directly on PATH
        cmd = shutil.which("tesseract")
        if cmd:
            pytesseract.pytesseract.tesseract_cmd = cmd
            _tesseract_available = True
            logger.info("Tesseract OCR engine found on PATH.")
        else:
            logger.warning("Tesseract OCR binary not detected. Scanned image OCR will fall back gracefully.")

    _tesseract_configured = True
    return _tesseract_available

def is_tesseract_available() -> bool:
    return init_tesseract()

def calculate_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def calculate_file_sha256(file_path: str) -> str:
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def extract_text_from_image(file_path: str) -> List[Dict[str, Any]]:
    """Extract text from an image file using Tesseract OCR if available."""
    tess_available = is_tesseract_available()
    
    if not tess_available:
        text = "[Image Document: OCR engine is not installed on the server environment. Please inspect the original image file directly.]"
        text_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
        return [{
            "page_number": 1,
            "text": text,
            "method": "ocr_unavailable",
            "confidence": 0.0,
            "text_sha256": text_hash,
        }]

    try:
        with Image.open(file_path) as img:
            # Convert to RGB if needed
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")
            
            data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
            confidences = [
                float(c) for c, w in zip(data.get("conf", []), data.get("text", []))
                if c != -1 and str(w).strip()
            ]
            avg_conf = (sum(confidences) / len(confidences)) if confidences else 0.0
            extracted_text = pytesseract.image_to_string(img).strip()

            if not extracted_text:
                extracted_text = "[Image contains no recognizable text]"
                avg_conf = 0.0

            text_hash = hashlib.sha256(extracted_text.encode("utf-8")).hexdigest()
            return [{
                "page_number": 1,
                "text": extracted_text,
                "method": "ocr",
                "confidence": round(avg_conf, 1),
                "text_sha256": text_hash,
            }]
    except Exception as exc:
        logger.error(f"Image OCR failed on {file_path}: {exc}", exc_info=True)
        fallback = f"[OCR processing error on image: {str(exc)}]"
        return [{
            "page_number": 1,
            "text": fallback,
            "method": "ocr_unavailable",
            "confidence": 0.0,
            "text_sha256": hashlib.sha256(fallback.encode("utf-8")).hexdigest(),
        }]

def extract_text_from_pdf(file_path: str) -> List[Dict[str, Any]]:
    """
    Extract text from a PDF file page-by-page.
    Uses native PDF text layer if available (>= 30 characters).
    Falls back to Tesseract OCR at 300 DPI for scanned pages.
    """
    results: List[Dict[str, Any]] = []
    tess_available = is_tesseract_available()

    try:
        doc = fitz.open(file_path)
    except Exception as exc:
        logger.error(f"Failed to open PDF {file_path}: {exc}", exc_info=True)
        fallback = f"[Corrupted or unreadable PDF document: {str(exc)}]"
        return [{
            "page_number": 1,
            "text": fallback,
            "method": "text_layer",
            "confidence": 0.0,
            "text_sha256": hashlib.sha256(fallback.encode("utf-8")).hexdigest(),
        }]

    try:
        total_pages = len(doc)
        if total_pages == 0:
            fallback = "[Empty PDF document with 0 pages]"
            return [{
                "page_number": 1,
                "text": fallback,
                "method": "text_layer",
                "confidence": 0.0,
                "text_sha256": hashlib.sha256(fallback.encode("utf-8")).hexdigest(),
            }]

        for page_idx in range(total_pages):
            page_number = page_idx + 1
            page = doc[page_idx]

            # 1. First check the native PDF text layer
            native_text = page.get_text("text").strip()

            # If page has substantial text layer (>= 30 characters), use it directly
            if len(native_text) >= 30:
                text_hash = hashlib.sha256(native_text.encode("utf-8")).hexdigest()
                results.append({
                    "page_number": page_number,
                    "text": native_text,
                    "method": "text_layer",
                    "confidence": 100.0,
                    "text_sha256": text_hash,
                })
                continue

            # 2. Scanned or image-only page: OCR fallback
            if tess_available:
                try:
                    # Render page at 300 DPI (72 * 4.1667 = 300 DPI)
                    dpi = 300.0
                    zoom = dpi / 72.0
                    matrix = fitz.Matrix(zoom, zoom)
                    pix = page.get_pixmap(matrix=matrix, alpha=False)
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

                    # Compute word-level confidence
                    data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
                    confidences = [
                        float(c) for c, w in zip(data.get("conf", []), data.get("text", []))
                        if c != -1 and str(w).strip()
                    ]
                    avg_conf = (sum(confidences) / len(confidences)) if confidences else 0.0
                    ocr_text = pytesseract.image_to_string(img).strip()

                    final_text = ocr_text or native_text or "[Scanned page: no text detected by OCR]"
                    confidence = round(avg_conf, 1) if ocr_text else (100.0 if native_text else 0.0)
                    method = "ocr" if ocr_text else ("text_layer" if native_text else "ocr")

                    text_hash = hashlib.sha256(final_text.encode("utf-8")).hexdigest()
                    results.append({
                        "page_number": page_number,
                        "text": final_text,
                        "method": method,
                        "confidence": confidence,
                        "text_sha256": text_hash,
                    })
                except Exception as ocr_err:
                    logger.warning(f"OCR error on PDF page {page_number}: {ocr_err}")
                    fallback_text = native_text or f"[OCR failed on page {page_number}: {str(ocr_err)}]"
                    results.append({
                        "page_number": page_number,
                        "text": fallback_text,
                        "method": "text_layer" if native_text else "ocr_unavailable",
                        "confidence": 100.0 if native_text else 0.0,
                        "text_sha256": hashlib.sha256(fallback_text.encode("utf-8")).hexdigest(),
                    })
            else:
                # Tesseract not available
                final_text = native_text if native_text else "[Scanned page: OCR engine unavailable on server]"
                results.append({
                    "page_number": page_number,
                    "text": final_text,
                    "method": "text_layer" if native_text else "ocr_unavailable",
                    "confidence": 100.0 if native_text else 0.0,
                    "text_sha256": hashlib.sha256(final_text.encode("utf-8")).hexdigest(),
                })
    finally:
        doc.close()

    return results

def extract_text_from_file(file_path: str, mime_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Entry point to extract text per page from PDF or image documents.
    Returns a list of dicts:
    [
        {
            "page_number": int,
            "text": str,
            "method": "text_layer" | "ocr" | "ocr_unavailable",
            "confidence": float,
            "text_sha256": str
        },
        ...
    ]
    """
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf" or (mime_type and "pdf" in mime_type.lower()):
        return extract_text_from_pdf(file_path)
    
    image_exts = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"}
    if ext in image_exts or (mime_type and mime_type.startswith("image/")):
        return extract_text_from_image(file_path)

    # For other files, fallback to UTF-8 text read if possible
    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        return [{
            "page_number": 1,
            "text": content,
            "method": "text_layer",
            "confidence": 100.0,
            "text_sha256": hashlib.sha256(content.encode("utf-8")).hexdigest(),
        }]
    except Exception as exc:
        fallback = f"[Unsupported document format: {ext}]"
        return [{
            "page_number": 1,
            "text": fallback,
            "method": "text_layer",
            "confidence": 0.0,
            "text_sha256": hashlib.sha256(fallback.encode("utf-8")).hexdigest(),
        }]
