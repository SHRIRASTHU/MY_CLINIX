import os
import io
import hashlib
import pytest
import pymupdf as fitz
from PIL import Image
from app.services.ocr_service import extract_text_from_file, is_tesseract_available

def create_sample_pdf(text_content: str) -> bytes:
    """Generate an in-memory PDF with a digital text layer using PyMuPDF."""
    doc = fitz.open()
    page = doc.new_page()
    rect = fitz.Rect(50, 50, 550, 750)
    page.insert_textbox(rect, text_content, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes

def create_sample_image() -> bytes:
    """Generate an in-memory PNG image."""
    img = Image.new("RGB", (200, 100), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

def test_ocr_service_pdf_text_layer_extraction(tmp_path):
    """Verify PyMuPDF extracts text layer directly with 100% confidence."""
    sample_text = (
        "CLINICAL LABORATORY REPORT\n"
        "Patient: John Doe | DOB: 1980-05-12\n"
        "Hemoglobin A1c: 6.8% (Elevated)\n"
        "Fasting Plasma Glucose: 135 mg/dL\n"
        "Physician Impression: Type 2 Diabetes Mellitus."
    )
    pdf_bytes = create_sample_pdf(sample_text)
    test_pdf_file = tmp_path / "clinical_report.pdf"
    test_pdf_file.write_bytes(pdf_bytes)

    pages = extract_text_from_file(str(test_pdf_file), "application/pdf")

    assert len(pages) == 1
    page = pages[0]
    assert page["page_number"] == 1
    assert page["method"] == "text_layer"
    assert page["confidence"] == 100.0
    assert "Hemoglobin A1c: 6.8%" in page["text"]
    assert page["text_sha256"] == hashlib.sha256(page["text"].encode("utf-8")).hexdigest()

def test_ocr_service_image_extraction(tmp_path):
    """Verify image extraction handles both OCR available and fallback states gracefully."""
    img_bytes = create_sample_image()
    test_img_file = tmp_path / "scan_document.png"
    test_img_file.write_bytes(img_bytes)

    pages = extract_text_from_file(str(test_img_file), "image/png")

    assert len(pages) == 1
    page = pages[0]
    assert page["page_number"] == 1
    assert page["method"] in ["ocr", "ocr_unavailable"]
    assert isinstance(page["confidence"], float)
    assert len(page["text_sha256"]) == 64

def test_upload_document_requires_doctor_role(client, db_session):
    """Verify patient role is forbidden (403) from uploading clinical records."""
    # Register patient
    pat_res = client.post("/api/v1/auth/register", json={
        "email": "pat_doc_test@hospital.org",
        "password": "SecurePassword123!",
        "full_name": "Patient Document Test",
        "role": "patient",
    })
    assert pat_res.status_code == 201
    pat_token = pat_res.json()["access_token"]
    pat_headers = {"Authorization": f"Bearer {pat_token}"}

    # Register admin to create the patient entity
    adm_res = client.post("/api/v1/auth/register", json={
        "email": "adm_doc_test@hospital.org",
        "password": "SecurePassword123!",
        "full_name": "Admin Document Test",
        "role": "administrator",
    })
    assert adm_res.status_code == 201
    adm_token = adm_res.json()["access_token"]
    adm_headers = {"Authorization": f"Bearer {adm_token}"}

    # Create patient record
    p_res = client.post("/api/v1/patients", json={
        "first_name": "Alice",
        "last_name": "Patient",
        "date_of_birth": "1990-01-01",
        "gender": "female",
        "blood_group": "A+",
    }, headers=adm_headers)
    assert p_res.status_code == 201
    patient_id = p_res.json()["id"]

    # Attempt upload as patient - should return 403 Forbidden
    pdf_bytes = create_sample_pdf("Sample text for unauthorized test.")
    upload_res = client.post(
        f"/api/v1/patients/{patient_id}/documents",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"document_type": "consultation"},
        headers=pat_headers,
    )
    assert upload_res.status_code == 403
    assert "Only doctors and administrators" in upload_res.json()["detail"]

def test_upload_document_rejects_unsupported_file_extension(client, db_session):
    """Verify upload rejects unsupported file types with 400 Bad Request."""
    doc_res = client.post("/api/v1/auth/register", json={
        "email": "dr_reject@hospital.org",
        "password": "SecurePassword123!",
        "full_name": "Dr. Reject Format",
        "role": "doctor",
    })
    assert doc_res.status_code == 201
    headers = {"Authorization": f"Bearer {doc_res.json()['access_token']}"}

    p_res = client.post("/api/v1/patients", json={
        "first_name": "Bob",
        "last_name": "Patient",
        "date_of_birth": "1985-03-15",
        "gender": "male",
        "blood_group": "B+",
    }, headers=headers)
    assert p_res.status_code == 201
    patient_id = p_res.json()["id"]

    bad_file = b"BINARY_EXECUTABLE_CONTENT"
    upload_res = client.post(
        f"/api/v1/patients/{patient_id}/documents",
        files={"file": ("malicious.exe", bad_file, "application/octet-stream")},
        data={"document_type": "scan"},
        headers=headers,
    )
    assert upload_res.status_code == 400
    assert "Unsupported file format" in upload_res.json()["detail"]

def test_upload_document_success_and_get_pages(client, db_session):
    """Verify successful document upload returns pages, and GET /pages retrieves them."""
    doc_res = client.post("/api/v1/auth/register", json={
        "email": "dr_success@hospital.org",
        "password": "SecurePassword123!",
        "full_name": "Dr. Success OCR",
        "role": "doctor",
    })
    assert doc_res.status_code == 201
    headers = {"Authorization": f"Bearer {doc_res.json()['access_token']}"}

    p_res = client.post("/api/v1/patients", json={
        "first_name": "Charlie",
        "last_name": "Patient",
        "date_of_birth": "1978-08-20",
        "gender": "male",
        "blood_group": "O+",
    }, headers=headers)
    assert p_res.status_code == 201
    patient_id = p_res.json()["id"]

    clinical_note = (
        "CONSULTATION NOTE\n"
        "Chief Complaint: Persistent cough for 2 weeks.\n"
        "Assessment: Acute viral bronchitis.\n"
        "Plan: Symptomatic relief with hydration and rest. Review in 7 days."
    )
    pdf_bytes = create_sample_pdf(clinical_note)

    upload_res = client.post(
        f"/api/v1/patients/{patient_id}/documents",
        files={"file": ("consultation_note.pdf", pdf_bytes, "application/pdf")},
        data={"document_type": "consultation", "document_date": "2026-11-12"},
        headers=headers,
    )
    assert upload_res.status_code == 201
    doc_data = upload_res.json()
    assert doc_data["file_name"] == "consultation_note.pdf"
    assert doc_data["page_count"] == 1
    assert "pages" in doc_data
    assert len(doc_data["pages"]) == 1
    assert doc_data["pages"][0]["extraction_method"] == "text_layer"
    assert "Acute viral bronchitis" in doc_data["pages"][0]["text"]
    assert doc_data["pages"][0]["ocr_confidence"] == 100.0

    document_id = doc_data["id"]

    # Verify GET /{patient_id}/documents/{document_id}/pages endpoint
    pages_res = client.get(
        f"/api/v1/patients/{patient_id}/documents/{document_id}/pages",
        headers=headers,
    )
    assert pages_res.status_code == 200
    pages = pages_res.json()
    assert len(pages) == 1
    assert pages[0]["page_number"] == 1
    assert pages[0]["extraction_method"] == "text_layer"
    assert "Acute viral bronchitis" in pages[0]["text"]
    assert pages[0]["text_sha256"] == hashlib.sha256(pages[0]["text"].encode("utf-8")).hexdigest()
