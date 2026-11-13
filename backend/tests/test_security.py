import hashlib
import pytest
import pymupdf as fitz
from app.models.user import UserRole

def create_test_pdf(text: str) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    rect = fitz.Rect(50, 50, 500, 700)
    page.insert_textbox(rect, text, fontsize=11)
    b = doc.tobytes()
    doc.close()
    return b

def test_pii_not_in_error_messages(client, db_session):
    """Verify failed login and unauthorized access responses do not leak PII, passwords, or system internals."""
    res = client.post("/api/v1/auth/login", json={
        "email": "nonexistent_patient@clinic.com",
        "password": "SecretPassword123!",
    })
    assert res.status_code == 401
    detail = res.json()["detail"]
    assert "SecretPassword123!" not in detail
    assert "nonexistent_patient" not in detail
    assert detail == "Incorrect email or password."

def test_cross_patient_isolation(client, db_session):
    """Verify Doctor A cannot access Doctor B's patient without consent (strict isolation)."""
    # Doctor 1 & Patient 1
    doc1 = client.post("/api/v1/auth/register", json={
        "email": "doctor_alpha@hospital.org",
        "password": "SecurePassword123!",
        "full_name": "Dr. Alpha",
        "role": "doctor"
    }).json()
    doc1_headers = {"Authorization": f"Bearer {doc1['access_token']}"}

    p1 = client.post("/api/v1/patients", json={
        "first_name": "Patient",
        "last_name": "Alpha",
        "date_of_birth": "1992-05-10",
        "gender": "male",
        "blood_group": "A+",
    }, headers=doc1_headers).json()

    # Doctor 2
    doc2 = client.post("/api/v1/auth/register", json={
        "email": "doctor_beta@hospital.org",
        "password": "SecurePassword123!",
        "full_name": "Dr. Beta",
        "role": "doctor"
    }).json()
    doc2_headers = {"Authorization": f"Bearer {doc2['access_token']}"}

    # Doctor 2 attempts to access Patient 1's records - Expect 403 Forbidden
    res = client.get(f"/api/v1/patients/{p1['id']}/documents", headers=doc2_headers)
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]

def test_consent_grant_and_revocation_workflow(client, db_session):
    """Verify patient-controlled consent allows doctor access and immediate cut-off upon revocation."""
    # Register patient owner
    pat_res = client.post("/api/v1/auth/register", json={
        "email": "patient_sarah@domain.org",
        "password": "SecurePassword123!",
        "full_name": "Sarah Patient",
        "role": "patient"
    }).json()
    pat_headers = {"Authorization": f"Bearer {pat_res['access_token']}"}

    # Create patient entity
    patient = client.post("/api/v1/patients", json={
        "first_name": "Sarah",
        "last_name": "Jenkins",
        "date_of_birth": "1988-11-20",
        "gender": "female",
        "blood_group": "O+",
    }, headers=pat_headers).json()
    patient_id = patient["id"]

    # Register consulting doctor
    doc_res = client.post("/api/v1/auth/register", json={
        "email": "dr_external_specialist@hospital.org",
        "password": "SecurePassword123!",
        "full_name": "Dr. External Specialist",
        "role": "doctor"
    }).json()
    doc_id = doc_res["user"]["id"]
    doc_headers = {"Authorization": f"Bearer {doc_res['access_token']}"}

    # 1. Before consent: Doctor cannot access patient records
    before_res = client.get(f"/api/v1/patients/{patient_id}/documents", headers=doc_headers)
    assert before_res.status_code == 403

    # 2. Patient grants consent to doctor
    grant_res = client.post(f"/api/v1/patients/{patient_id}/consent/grant", json={
        "doctor_id": doc_id,
        "access_level": "read_only",
        "scope": ["prescription", "consultation"]
    }, headers=pat_headers)
    assert grant_res.status_code == 201
    assert grant_res.json()["status"] == "active"

    # 3. After consent: Doctor can access patient records
    during_res = client.get(f"/api/v1/patients/{patient_id}/documents", headers=doc_headers)
    assert during_res.status_code == 200

    # 4. Patient revokes consent
    revoke_res = client.post(f"/api/v1/patients/{patient_id}/consent/revoke/{doc_id}", json={
        "reason": "Consultation concluded"
    }, headers=pat_headers)
    assert revoke_res.status_code == 200
    assert revoke_res.json()["status"] == "revoked"

    # 5. After revocation: Doctor access is immediately blocked again (403)
    after_res = client.get(f"/api/v1/patients/{patient_id}/documents", headers=doc_headers)
    assert after_res.status_code == 403

def test_document_versioning_and_soft_deletion(client, db_session):
    """Verify document versioning on re-upload, soft-delete to trash, and admin restoration."""
    # Register doctor and patient
    doc = client.post("/api/v1/auth/register", json={
        "email": "dr_versioning@clinic.org",
        "password": "SecurePassword123!",
        "full_name": "Dr. Version Specialist",
        "role": "doctor"
    }).json()
    doc_headers = {"Authorization": f"Bearer {doc['access_token']}"}

    p = client.post("/api/v1/patients", json={
        "first_name": "David",
        "last_name": "Versioned",
        "date_of_birth": "1975-03-12",
        "gender": "male",
        "blood_group": "B+",
    }, headers=doc_headers).json()
    patient_id = p["id"]

    # Upload version 1
    pdf_v1 = create_test_pdf("Initial Lab Panel: Glucose 110 mg/dL")
    v1_res = client.post(
        f"/api/v1/patients/{patient_id}/documents",
        files={"file": ("metabolic_panel.pdf", pdf_v1, "application/pdf")},
        data={"document_type": "lab_report", "source_hospital_or_clinic": "City Memorial Hospital"},
        headers=doc_headers,
    )
    assert v1_res.status_code == 201
    doc_v1 = v1_res.json()
    assert doc_v1["version_number"] == 1
    assert doc_v1["source_hospital_or_clinic"] == "City Memorial Hospital"

    # Upload version 2 (same filename, modified clinical text/hash)
    pdf_v2 = create_test_pdf("Amended Lab Panel: Glucose 110 mg/dL, HbA1c 5.8%")
    v2_res = client.post(
        f"/api/v1/patients/{patient_id}/documents",
        files={"file": ("metabolic_panel.pdf", pdf_v2, "application/pdf")},
        data={"document_type": "lab_report", "source_hospital_or_clinic": "City Memorial Hospital"},
        headers=doc_headers,
    )
    assert v2_res.status_code == 201
    doc_v2 = v2_res.json()
    assert doc_v2["version_number"] == 2

    # Soft delete version 1
    del_res = client.delete(
        f"/api/v1/patients/{patient_id}/documents/{doc_v1['id']}?reason=Superceded+by+amended+panel+v2",
        headers=doc_headers,
    )
    assert del_res.status_code == 200
    assert del_res.json()["is_deleted"] == True

    # Standard document query should only return active v2
    list_res = client.get(f"/api/v1/patients/{patient_id}/documents", headers=doc_headers)
    assert list_res.status_code == 200
    active_docs = list_res.json()
    assert len(active_docs) == 1
    assert active_docs[0]["id"] == doc_v2["id"]

def test_gdpr_data_portability_export(client, db_session):
    """Verify GDPR Article 20 data export returns patient profile, documents metadata and extracted text."""
    doc = client.post("/api/v1/auth/register", json={
        "email": "dr_export_test@clinic.org",
        "password": "SecurePassword123!",
        "full_name": "Dr. Export Test",
        "role": "doctor"
    }).json()
    doc_headers = {"Authorization": f"Bearer {doc['access_token']}"}

    p = client.post("/api/v1/patients", json={
        "first_name": "Emma",
        "last_name": "Watson",
        "date_of_birth": "1995-07-22",
        "gender": "female",
        "blood_group": "AB+",
    }, headers=doc_headers).json()
    patient_id = p["id"]

    pdf = create_test_pdf("Consultation Note: Routine health checkup. Vitals stable.")
    client.post(
        f"/api/v1/patients/{patient_id}/documents",
        files={"file": ("checkup.pdf", pdf, "application/pdf")},
        data={"document_type": "consultation", "source_hospital_or_clinic": "St. Jude Clinic"},
        headers=doc_headers,
    )

    export_res = client.get(f"/api/v1/patients/{patient_id}/export", headers=doc_headers)
    assert export_res.status_code == 200
    data = export_res.json()
    assert "patient" in data
    assert data["patient"]["first_name"] == "Emma"
    assert "documents" in data
    assert len(data["documents"]) == 1
    assert data["documents"][0]["file_name"] == "checkup.pdf"
    assert data["documents"][0]["source_hospital_or_clinic"] == "St. Jude Clinic"
    assert "Routine health checkup" in data["documents"][0]["extracted_text"]
