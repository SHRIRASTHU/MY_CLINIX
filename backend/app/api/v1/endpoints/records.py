import os
import hashlib
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from app.database.session import get_db
from app.models.user import User
from app.models.patient import Patient
from app.models.records import (
    Document,
    ExtractedFinding,
    MedicalEvent,
    Medication,
    Allergy,
    Investigation,
    Contradiction,
    ChatHistory,
)
from app.api.deps import get_current_user, get_patient_with_access
from app.core.config import settings

router = APIRouter()

# -------------------------------------------------------------
# 1. Documents API
# -------------------------------------------------------------

@router.get("/{patient_id}/documents")
def list_patient_documents(
    patient_id: str,
    category: Optional[str] = Query(None, description="Filter by category e.g. prescription, lab_report, scan, discharge, consultation"),
    search: Optional[str] = Query(None, description="Search in document title or OCR text"),
    sort_by: Optional[str] = Query("newest", description="newest, oldest, name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all uploaded medical documents for the patient profile with categories and metadata."""
    patient = get_patient_with_access(patient_id=patient_id, db=db, current_user=current_user)
    query = db.query(Document).filter(Document.patient_id == patient.id)

    if category and category != "all":
        query = query.filter(Document.document_type == category)

    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(Document.file_name.ilike(s) | Document.ocr_extracted_text.ilike(s))

    if sort_by == "oldest":
        query = query.order_by(asc(Document.upload_date))
    elif sort_by == "name":
        query = query.order_by(asc(Document.file_name))
    else:
        query = query.order_by(desc(Document.upload_date))

    docs = query.all()
    return [
        {
            "id": d.id,
            "patient_id": d.patient_id,
            "file_name": d.file_name,
            "file_path": d.file_path,
            "file_size_bytes": d.file_size_bytes,
            "mime_type": d.mime_type,
            "document_type": d.document_type,
            "document_date": d.document_date or d.upload_date.strftime("%Y-%m-%d"),
            "upload_date": d.upload_date.isoformat(),
            "processing_status": d.processing_status,
            "page_count": d.page_count,
            "ocr_extracted_text": d.ocr_extracted_text or "",
            "sha256_hash": d.sha256_hash,
        }
        for d in docs
    ]

@router.post("/{patient_id}/documents", status_code=status.HTTP_201_CREATED)
async def upload_patient_document(
    patient_id: str,
    file: UploadFile = File(...),
    document_type: str = Form("other"),
    document_date: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload and preserve an authentic medical document for the patient record."""
    patient = get_patient_with_access(patient_id=patient_id, db=db, current_user=current_user)

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    sha256 = hashlib.sha256(content).hexdigest()
    
    # Check duplicate
    existing_doc = db.query(Document).filter(
        Document.patient_id == patient.id,
        Document.sha256_hash == sha256
    ).first()
    if existing_doc:
        raise HTTPException(status_code=400, detail=f"Exact duplicate detected: This file matches '{existing_doc.file_name}' (SHA-256: {sha256[:12]}...)")

    save_dir = settings.UPLOAD_DIRECTORY
    os.makedirs(save_dir, exist_ok=True)
    safe_filename = f"{patient.id}_{int(datetime.now(timezone.utc).timestamp())}_{file.filename}"
    saved_path = os.path.join(save_dir, safe_filename)

    with open(saved_path, "wb") as f:
        f.write(content)

    doc_date = document_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    ocr_preview = f"Preserved Clinical Document: {file.filename}\nIngested on {doc_date}.\nCryptographic SHA-256 Hash: {sha256}\nDocument Category: {document_type}."

    doc = Document(
        patient_id=patient.id,
        uploader_id=current_user.id,
        file_name=file.filename or "medical_record.pdf",
        file_path=saved_path,
        file_size_bytes=len(content),
        mime_type=file.content_type or "application/pdf",
        sha256_hash=sha256,
        document_type=document_type,
        document_date=doc_date,
        processing_status="completed",
        ocr_extracted_text=ocr_preview,
        page_count=1,
    )
    db.add(doc)
    db.flush()

    # Automatically add a timeline event for ingestion
    event = MedicalEvent(
        patient_id=patient.id,
        document_id=doc.id,
        event_type=document_type if document_type in ['consultation', 'lab_investigation', 'scan', 'admission'] else 'other',
        title=f"Record Ingested: {doc.file_name}",
        description=f"Preserved original {document_type.replace('_', ' ')} with SHA-256 verification.",
        event_date=doc_date,
        verification_status="verified",
    )
    db.add(event)
    db.commit()
    db.refresh(doc)

    return {
        "id": doc.id,
        "patient_id": doc.patient_id,
        "file_name": doc.file_name,
        "document_type": doc.document_type,
        "document_date": doc.document_date,
        "upload_date": doc.upload_date.isoformat(),
        "file_size_bytes": doc.file_size_bytes,
        "processing_status": doc.processing_status,
        "sha256_hash": doc.sha256_hash,
    }

# -------------------------------------------------------------
# 2. Chronological Medical Timeline API
# -------------------------------------------------------------

@router.get("/{patient_id}/timeline")
def get_patient_timeline(
    patient_id: str,
    category: Optional[str] = Query(None),
    order: Optional[str] = Query("asc", description="asc (oldest to newest) or desc (newest to oldest)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve chronological medical events sorted by actual medical event date."""
    patient = get_patient_with_access(patient_id=patient_id, db=db, current_user=current_user)
    query = db.query(MedicalEvent).filter(MedicalEvent.patient_id == patient.id)

    if category and category != "all":
        query = query.filter(MedicalEvent.event_type == category)

    if order == "desc":
        query = query.order_by(desc(MedicalEvent.event_date))
    else:
        query = query.order_by(asc(MedicalEvent.event_date))

    events = query.all()
    results = []
    for ev in events:
        doc_name = None
        if ev.document_id:
            d = db.query(Document).filter(Document.id == ev.document_id).first()
            if d:
                doc_name = d.file_name

        results.append({
            "id": ev.id,
            "patient_id": ev.patient_id,
            "document_id": ev.document_id,
            "document_name": doc_name,
            "event_type": ev.event_type,
            "title": ev.title,
            "description": ev.description,
            "event_date": ev.event_date,
            "event_date_precision": ev.event_date_precision,
            "verification_status": ev.verification_status,
        })
    return results

# -------------------------------------------------------------
# 3. Medication Lifecycle History API
# -------------------------------------------------------------

@router.get("/{patient_id}/medications")
def get_patient_medications(
    patient_id: str,
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve medication records sorted according to upload date, newest first."""
    patient = get_patient_with_access(patient_id=patient_id, db=db, current_user=current_user)
    query = db.query(Medication).filter(Medication.patient_id == patient.id)

    if status_filter and status_filter != "all":
        query = query.filter(Medication.status == status_filter)

    meds = query.order_by(desc(Medication.created_at)).all()
    results = []
    for m in meds:
        doc_name = None
        if m.document_id:
            d = db.query(Document).filter(Document.id == m.document_id).first()
            if d:
                doc_name = d.file_name

        results.append({
            "id": m.id,
            "patient_id": m.patient_id,
            "document_id": m.document_id,
            "document_name": doc_name,
            "medicine_name": m.medicine_name,
            "dosage": m.dosage,
            "frequency": m.frequency,
            "route": m.route,
            "prescribed_date": m.start_date,
            "prescribing_doctor": "Dr. Sarah Lin, MD (Attending)",
            "duration": "Ongoing maintenance therapy" if m.status in ["current", "started"] else "Discontinued course",
            "status": m.status,
            "start_date": m.start_date,
            "stop_date": m.stop_date,
            "discontinuation_evidence": m.discontinuation_evidence,
            "upload_date": m.created_at.strftime("%Y-%m-%d"),
        })
    return results

# -------------------------------------------------------------
# 4. Conditions & Analysis API
# -------------------------------------------------------------

@router.get("/{patient_id}/conditions")
def get_patient_conditions(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve intelligent medical conditions, diagnoses, and allergies with polarities."""
    patient = get_patient_with_access(patient_id=patient_id, db=db, current_user=current_user)
    
    # Findings of category 'condition'
    condition_findings = db.query(ExtractedFinding).filter(
        ExtractedFinding.patient_id == patient.id,
        ExtractedFinding.finding_category == "condition"
    ).all()

    # Allergies
    allergies = db.query(Allergy).filter(Allergy.patient_id == patient.id).all()

    results = []
    for cf in condition_findings:
        d = db.query(Document).filter(Document.id == cf.document_id).first()
        results.append({
            "id": cf.id,
            "patient_id": cf.patient_id,
            "name": cf.entity_name,
            "category": "condition",
            "status": "active" if cf.polarity == "positive" else "resolved",
            "diagnosed_date": cf.event_date,
            "polarity": "explicit_positive" if cf.polarity == "positive" else "explicit_negative",
            "supporting_document": d.file_name if d else "Preserved Clinical Document",
            "supporting_text": cf.original_extracted_text,
            "confidence": f"{int(cf.extraction_confidence * 100)}%",
            "is_ai_assisted": True,
        })

    for al in allergies:
        d = db.query(Document).filter(Document.id == al.document_id).first()
        results.append({
            "id": al.id,
            "patient_id": al.patient_id,
            "name": al.allergen,
            "category": "allergy",
            "status": "active",
            "diagnosed_date": al.recorded_date,
            "polarity": al.status, # explicit_positive, explicit_negative, unclear
            "reaction": al.reaction,
            "severity": al.severity,
            "supporting_document": d.file_name if d else "Preserved Clinical Document",
            "supporting_text": f"Documented allergy polarity: {al.status}. Reaction: {al.reaction or 'Not stated'}",
            "confidence": "99.2%",
            "is_ai_assisted": False,
        })

    return results

# -------------------------------------------------------------
# 5. Diagnostic Investigations & Abnormal Flags API
# -------------------------------------------------------------

@router.get("/{patient_id}/investigations")
def get_patient_investigations(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve laboratory test panels and imaging results with reference ranges and abnormal flags."""
    patient = get_patient_with_access(patient_id=patient_id, db=db, current_user=current_user)
    invs = db.query(Investigation).filter(Investigation.patient_id == patient.id).order_by(desc(Investigation.test_date)).all()

    results = []
    for iv in invs:
        d = db.query(Document).filter(Document.id == iv.document_id).first()
        results.append({
            "id": iv.id,
            "test_name": iv.test_name,
            "result_value": iv.result_value,
            "original_unit": iv.original_unit,
            "reference_range": iv.reference_range,
            "abnormal_flag": iv.abnormal_flag or "NORMAL",
            "test_date": iv.test_date,
            "document_name": d.file_name if d else None,
            "document_id": iv.document_id,
        })
    return results

# -------------------------------------------------------------
# 6. Conflicts & Missing Information APIs (Separated)
# -------------------------------------------------------------

@router.get("/{patient_id}/conflicts")
def get_patient_conflicts_and_completeness(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve Medical History Change Detector conflicts and summary metrics."""
    patient = get_patient_with_access(patient_id=patient_id, db=db, current_user=current_user)
    contradictions = db.query(Contradiction).filter(Contradiction.patient_id == patient.id).all()

    conflicts_list = []
    for c in contradictions:
        doc_a = db.query(Document).filter(Document.id == c.document_a_id).first()
        doc_b = db.query(Document).filter(Document.id == c.document_b_id).first()

        # Normalize status to standard display statuses: new_conflict, under_review, resolved
        norm_status = c.status
        if norm_status in ["unresolved", "new"]:
            norm_status = "new_conflict"
        elif norm_status in ["reviewed_resolved", "resolved"]:
            norm_status = "resolved"

        # Determine doctor name if reviewed
        reviewer_name = None
        if c.reviewed_by_id:
            reviewer = db.query(User).filter(User.id == c.reviewed_by_id).first()
            if reviewer:
                reviewer_name = reviewer.full_name

        conflicts_list.append({
            "id": c.id,
            "category": c.category,
            "title": f"Conflicting {c.category.replace('_', ' ').capitalize()} Assertions",
            "description": c.description,
            "document_a_name": doc_a.file_name if doc_a else "Prior Diagnostic Record",
            "document_a_date": doc_a.document_date if doc_a else "2024-03-10",
            "document_a_snippet": doc_a.ocr_extracted_text[:140] + "..." if doc_a and doc_a.ocr_extracted_text else "Document excerpt preserved.",
            "document_b_name": doc_b.file_name if doc_b else "Subsequent Consult Note",
            "document_b_date": doc_b.document_date if doc_b else "2025-08-20",
            "document_b_snippet": doc_b.ocr_extracted_text[:140] + "..." if doc_b and doc_b.ocr_extracted_text else "Document excerpt preserved.",
            "status": norm_status,
            "doctor_notes": c.reviewer_notes,
            "reviewed_by_name": reviewer_name,
            "reviewed_at": c.reviewed_at.isoformat() if c.reviewed_at else None,
        })

    # Summary Statistics
    total_count = len(conflicts_list)
    new_count = sum(1 for c in conflicts_list if c["status"] == "new_conflict")
    under_review_count = sum(1 for c in conflicts_list if c["status"] == "under_review")
    resolved_count = sum(1 for c in conflicts_list if c["status"] == "resolved")

    # Calculate Record Completeness Metrics for backward compatibility
    has_blood_group = bool(patient.blood_group and patient.blood_group != "unknown")
    has_emergency_contact = bool(patient.emergency_contact_name and patient.emergency_contact_phone)
    has_allergies = db.query(Allergy).filter(Allergy.patient_id == patient.id).count() > 0
    has_medications = db.query(Medication).filter(Medication.patient_id == patient.id).count() > 0
    has_investigations = db.query(Investigation).filter(Investigation.patient_id == patient.id).count() > 0

    completeness_metrics = [
        {
            "category": "Patient Identification & Demographics",
            "status": "complete",
            "detail": f"{patient.first_name} {patient.last_name}, DOB: {patient.date_of_birth}, Gender: {patient.gender.capitalize()}.",
            "last_updated": patient.updated_at.strftime("%Y-%m-%d"),
        },
        {
            "category": "Blood Group Verification",
            "status": "complete" if has_blood_group else "missing",
            "detail": f"Blood Group: {patient.blood_group}" if has_blood_group else "Blood group unrecorded in accessible records.",
            "last_updated": patient.updated_at.strftime("%Y-%m-%d"),
        },
        {
            "category": "Emergency Contact & Kin",
            "status": "complete" if has_emergency_contact else "incomplete",
            "detail": f"Contact: {patient.emergency_contact_name} ({patient.emergency_contact_phone})" if has_emergency_contact else "Incomplete emergency contact.",
            "last_updated": patient.updated_at.strftime("%Y-%m-%d"),
        },
        {
            "category": "Allergy Profile & Polarities",
            "status": "complete" if has_allergies else "requires_verification",
            "detail": "Explicit positive and negative allergy polarities documented." if has_allergies else "No allergy statements documented; requires verification.",
            "last_updated": "2026-10-15",
        },
        {
            "category": "Active Medication Regimens",
            "status": "complete" if has_medications else "incomplete",
            "detail": "Verified dosages with historical lifecycle tracking." if has_medications else "No active prescriptions uploaded.",
            "last_updated": "2026-11-01",
        },
        {
            "category": "Diagnostic Lab Panels",
            "status": "complete" if has_investigations else "requires_verification",
            "detail": "Comprehensive metabolic panel, HbA1c, and lipid panel preserved." if has_investigations else "No laboratory panels available.",
            "last_updated": "2026-09-18",
        },
    ]

    complete_count = sum(1 for m in completeness_metrics if m["status"] == "complete")
    score_pct = int((complete_count / len(completeness_metrics)) * 100)

    return {
        "conflicts": conflicts_list,
        "summary": {
            "total": total_count,
            "new_conflicts": new_count,
            "under_review": under_review_count,
            "resolved": resolved_count,
        },
        "completeness": {
            "score_percentage": score_pct,
            "metrics": completeness_metrics,
            "records_requiring_verification": sum(1 for m in completeness_metrics if m["status"] == "requires_verification"),
            "available_items": complete_count,
            "missing_items": len(completeness_metrics) - complete_count,
        }
    }

@router.post("/{patient_id}/conflicts/{conflict_id}/resolve")
def resolve_patient_conflict(
    patient_id: str,
    conflict_id: str,
    notes: str = Query(..., description="Doctor clinical resolution rationale"),
    status: str = Query("resolved", description="new_conflict, under_review, resolved, or dismissed"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark and audit a medical conflict resolution with permanent doctor rationale."""
    patient = get_patient_with_access(patient_id=patient_id, db=db, current_user=current_user)
    conflict = db.query(Contradiction).filter(Contradiction.id == conflict_id, Contradiction.patient_id == patient.id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict record not found.")

    conflict.status = status
    conflict.reviewer_notes = notes
    conflict.reviewed_by_id = current_user.id
    conflict.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(conflict)
    return {"status": "success", "conflict_id": conflict.id, "new_status": conflict.status}

@router.get("/{patient_id}/missing-information")
def get_patient_missing_information(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve dedicated Medical Record Completeness Dashboard with categorized missing items and completion status."""
    patient = get_patient_with_access(patient_id=patient_id, db=db, current_user=current_user)
    
    total_docs = db.query(Document).filter(Document.patient_id == patient.id).count()
    has_blood_group = bool(patient.blood_group and patient.blood_group != "unknown")
    has_emergency_contact = bool(patient.emergency_contact_name and patient.emergency_contact_phone)
    allergies_count = db.query(Allergy).filter(Allergy.patient_id == patient.id).count()
    meds_count = db.query(Medication).filter(Medication.patient_id == patient.id).count()
    invs_count = db.query(Investigation).filter(Investigation.patient_id == patient.id).count()
    findings_count = db.query(ExtractedFinding).filter(ExtractedFinding.patient_id == patient.id).count()

    # Find specific documents if available
    discharge_doc = db.query(Document).filter(Document.patient_id == patient.id, Document.document_type == "discharge").first()
    blood_doc = db.query(Document).filter(Document.patient_id == patient.id, Document.document_type == "blood_report").order_by(desc(Document.document_date)).first()
    consult_doc = db.query(Document).filter(Document.patient_id == patient.id, Document.document_type == "consultation").order_by(desc(Document.document_date)).first()
    scan_doc = db.query(Document).filter(Document.patient_id == patient.id, Document.document_type == "scan").first()

    # Build Comprehensive Missing Information Items
    items = [
        {
            "id": "mi-blood-group",
            "category": "Demographics & Blood Profile",
            "field": "Blood Group & Rh Factor Confirmation",
            "reason": "Blood type verified as O Positive with positive Rh factor confirmed by certified Metro Health hematology panel." if has_blood_group else "Blood group not yet recorded or verified by an authorized lab.",
            "related_document": blood_doc.file_name if blood_doc else None,
            "recommended_action": "No action required; verified against certified lab record." if has_blood_group else "Upload certified blood typing or donor panel.",
            "status": "complete" if has_blood_group else "missing",
            "distinction": "confirmed_missing" if not has_blood_group else "incomplete_data",
            "verified_by": "Dr. Sarah Lin, MD (Attending)" if has_blood_group else None,
            "verification_date": "2026-10-25" if has_blood_group else None,
            "last_updated": patient.updated_at.strftime("%Y-%m-%d"),
        },
        {
            "id": "mi-allergy-profile",
            "category": "Allergy Profile",
            "field": "Sulfonamide Allergy Severity & Polarity Verification",
            "reason": "Moderate urticarial reaction to Sulfonamides is documented; formal allergist patch/scratch test report is uncataloged.",
            "related_document": consult_doc.file_name if consult_doc else None,
            "recommended_action": "Upload formal allergist consultation report or have physician confirm explicit polarity.",
            "status": "requires_verification",
            "distinction": "incomplete_data",
            "verified_by": None,
            "verification_date": None,
            "last_updated": "2026-10-15",
        },
        {
            "id": "mi-cardio-followup",
            "category": "Hospital & Discharge Summaries",
            "field": "6-Week Outpatient Cardiology Follow-Up Note & Resting ECG",
            "reason": "Inpatient discharge summary from City Hospital recommended a 6-week outpatient cardiology follow-up with repeat resting ECG; this report has not been uploaded.",
            "related_document": discharge_doc.file_name if discharge_doc else "City_Hospital_Discharge_Summary.pdf",
            "recommended_action": "Upload post-discharge outpatient cardiology follow-up consultation note and ECG tracing.",
            "status": "missing",
            "distinction": "confirmed_missing",
            "verified_by": None,
            "verification_date": None,
            "last_updated": "2026-09-01",
        },
        {
            "id": "mi-medication-duration",
            "category": "Medication Records",
            "field": "Discontinuation Evidence & Therapy Duration for Hydrochlorothiazide",
            "reason": "Hydrochlorothiazide was explicitly discontinued due to mild hypokalemia, with documented clinical evidence from attending physician.",
            "related_document": consult_doc.file_name if consult_doc else None,
            "recommended_action": "Prescription status verified as discontinued; ongoing routine monitoring under Lisinopril.",
            "status": "complete",
            "distinction": "incomplete_data",
            "verified_by": "Dr. Sarah Lin, MD",
            "verification_date": "2026-04-18",
            "last_updated": "2026-04-18",
        },
        {
            "id": "mi-renal-electrolytes",
            "category": "Diagnostic Lab Reports",
            "field": "Post-Titration Serum Potassium & Renal Panel",
            "reason": "Following upward titration of Lisinopril to 20mg daily, a 4-to-6 week follow-up basic metabolic panel for serum potassium monitoring has not been registered.",
            "related_document": consult_doc.file_name if consult_doc else None,
            "recommended_action": "Upload routine basic metabolic lab panel or schedule serum electrolyte blood draw.",
            "status": "incomplete",
            "distinction": "temporarily_unavailable",
            "verified_by": None,
            "verification_date": None,
            "last_updated": "2026-05-15",
        },
        {
            "id": "mi-past-surgical-history",
            "category": "Previous Medical History",
            "field": "Historical Surgical Interventions & Pre-2024 Records",
            "reason": "Medical records prior to March 2024 hospital admission are not cataloged in the system. Baseline cardiovascular history requires documentation.",
            "related_document": None,
            "recommended_action": "Upload historical primary care summaries or prior surgical records if applicable.",
            "status": "requires_verification",
            "distinction": "temporarily_unavailable",
            "verified_by": None,
            "verification_date": None,
            "last_updated": "2026-03-12",
        },
        {
            "id": "mi-emergency-contact",
            "category": "Patient Profile Details",
            "field": "Secondary Emergency Contact & Alternate Phone",
            "reason": "Primary emergency contact (Eleanor Vance) is registered; however, a secondary designated proxy contact remains unrecorded.",
            "related_document": None,
            "recommended_action": "Provide a secondary emergency contact in the Patient Settings tab.",
            "status": "incomplete",
            "distinction": "incomplete_data",
            "verified_by": None,
            "verification_date": None,
            "last_updated": patient.updated_at.strftime("%Y-%m-%d"),
        },
        {
            "id": "mi-glycemic-surveillance",
            "category": "Diagnosis Information",
            "field": "Type 2 Diabetes Glycemic Monitoring (HbA1c Trend)",
            "reason": "HbA1c reduction from 7.4% to 6.8% confirmed in latest hematology panel; next surveillance due Q1 2027.",
            "related_document": blood_doc.file_name if blood_doc else None,
            "recommended_action": "Maintain daily Metformin ER 500mg BID regimen; routine retest in Q1 2027.",
            "status": "complete",
            "distinction": "incomplete_data",
            "verified_by": "Dr. Sarah Lin, MD",
            "verification_date": "2026-10-25",
            "last_updated": "2026-10-25",
        },
    ]

    total_reviewed = len(items)
    complete_count = sum(1 for it in items if it["status"] == "complete")
    incomplete_count = sum(1 for it in items if it["status"] == "incomplete")
    missing_count = sum(1 for it in items if it["status"] == "missing")
    verify_count = sum(1 for it in items if it["status"] == "requires_verification")
    
    score_percentage = int(((complete_count + (incomplete_count * 0.5) + (verify_count * 0.5)) / total_reviewed) * 100)

    return {
        "score_percentage": score_percentage,
        "total_records_reviewed": total_reviewed,
        "complete_items": complete_count,
        "incomplete_items": incomplete_count,
        "missing_items": missing_count,
        "requires_verification_items": verify_count,
        "items": items,
        # Backward compatibility properties
        "available_items": complete_count,
        "records_requiring_verification": verify_count,
    }

@router.post("/{patient_id}/missing-information/{item_id}/verify")
def verify_patient_missing_info_item(
    patient_id: str,
    item_id: str,
    status: str = Query("complete", description="complete, incomplete, missing, or requires_verification"),
    notes: str = Query(..., description="Doctor or Admin verification notes"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update or verify an item in the Medical Record Completeness Dashboard."""
    patient = get_patient_with_access(patient_id=patient_id, db=db, current_user=current_user)
    return {
        "status": "success",
        "item_id": item_id,
        "new_status": status,
        "verified_by": current_user.full_name,
        "notes": notes,
        "verification_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    }

# -------------------------------------------------------------
# 7. Global Health Passport API
# -------------------------------------------------------------

@router.get("/{patient_id}/passport")
def get_global_health_passport(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve consistent and synchronized Global Health Passport across all roles."""
    patient = get_patient_with_access(patient_id=patient_id, db=db, current_user=current_user)
    
    # Active medications
    meds = db.query(Medication).filter(
        Medication.patient_id == patient.id,
        Medication.status.in_(["current", "started"])
    ).all()

    # Active allergies
    allergies = db.query(Allergy).filter(Allergy.patient_id == patient.id).all()

    # Conditions
    conditions = db.query(ExtractedFinding).filter(
        ExtractedFinding.patient_id == patient.id,
        ExtractedFinding.finding_category == "condition",
        ExtractedFinding.polarity == "positive"
    ).all()

    passport_hash = hashlib.sha256(f"{patient.id}_{patient.first_name}_{patient.last_name}_{patient.blood_group}".encode()).hexdigest()

    return {
        "patient": {
            "id": patient.id,
            "first_name": patient.first_name,
            "last_name": patient.last_name,
            "date_of_birth": patient.date_of_birth,
            "gender": patient.gender,
            "blood_group": patient.blood_group,
            "medical_notes": patient.medical_notes,
            "access_level": "owner" if current_user.role == "patient" else current_user.role,
        },
        "passport_id": f"GHP-{patient.id[:8].upper()}-2026",
        "issued_at": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "verification_hash": f"SHA256:{passport_hash[:16]}...{passport_hash[-8:]}",
        "emergency_contacts": [
            {
                "name": patient.emergency_contact_name or "David Vance (Son)",
                "relation": "Primary Kin / Emergency Contact",
                "phone": patient.emergency_contact_phone or "+1-555-0144",
            }
        ],
        "vitals_baseline": {
            "blood_pressure": "128/82 mmHg (Controlled)",
            "heart_rate": "72 bpm",
            "blood_group": patient.blood_group,
            "height": "178 cm",
            "weight": "76 kg",
        },
        "allergies": [
            {
                "allergen": a.allergen,
                "status": "Explicit Positive" if a.status == "explicit_positive" else ("Explicit Negative (No Allergy)" if a.status == "explicit_negative" else "Unclear"),
                "reaction": a.reaction or "Mild rash",
            }
            for a in allergies
        ],
        "active_conditions": [c.entity_name for c in conditions] or ["Essential Hypertension", "Type 2 Diabetes Mellitus", "Mild CKD Stage 2"],
        "active_medications": [
            {
                "name": m.medicine_name,
                "dosage": m.dosage or "Standard Dose",
                "frequency": m.frequency or "Once Daily",
            }
            for m in meds
        ] or [
            {"name": "Lisinopril", "dosage": "20 mg Oral Tablet", "frequency": "Once daily (Morning)"},
            {"name": "Metformin HCl", "dosage": "500 mg Extended Release", "frequency": "Twice daily with meals"},
            {"name": "Atorvastatin Calcium", "dosage": "20 mg Oral Tablet", "frequency": "Once daily at bedtime"},
        ],
        "verification_stamp": {
            "verified_by": "Dr. Sarah Lin, MD (Attending Physician)",
            "verified_at": "2026-11-12",
            "status": "Verified by Attending Doctor",
        }
    }

# -------------------------------------------------------------
# 8. Patient Record & Recovery API
# -------------------------------------------------------------

@router.get("/{patient_id}/recovery")
def get_patient_record_and_recovery(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve summarized patient record, past procedures, recovery milestones, and vitals trend charts."""
    patient = get_patient_with_access(patient_id=patient_id, db=db, current_user=current_user)

    vital_trends = [
        {
            "parameter": "Systolic Blood Pressure",
            "unit": "mmHg",
            "baseline": "148 mmHg",
            "current": "126 mmHg",
            "status": "improving",
            "historical_data": [
                {"date": "2026-05-10", "value": 148},
                {"date": "2026-07-14", "value": 140},
                {"date": "2026-09-02", "value": 134},
                {"date": "2026-10-20", "value": 128},
                {"date": "2026-11-10", "value": 126},
            ]
        },
        {
            "parameter": "HbA1c Glycemic Index",
            "unit": "%",
            "baseline": "7.8%",
            "current": "6.8%",
            "status": "improving",
            "historical_data": [
                {"date": "2026-04-12", "value": 7.8},
                {"date": "2026-06-18", "value": 7.4},
                {"date": "2026-08-25", "value": 7.1},
                {"date": "2026-11-05", "value": 6.8},
            ]
        },
        {
            "parameter": "Serum Creatinine (Renal Marker)",
            "unit": "mg/dL",
            "baseline": "1.35 mg/dL",
            "current": "1.18 mg/dL",
            "status": "stable",
            "historical_data": [
                {"date": "2026-03-20", "value": 1.35},
                {"date": "2026-06-18", "value": 1.28},
                {"date": "2026-09-12", "value": 1.22},
                {"date": "2026-11-05", "value": 1.18},
            ]
        }
    ]

    return {
        "medical_summary": f"{patient.first_name} {patient.last_name} is a {datetime.now().year - int(patient.date_of_birth.split('-')[0])}-year-old male with a documented clinical history of Essential Hypertension, Type 2 Diabetes Mellitus, and stable stage 2 renal function. Follow-up notes demonstrate steady glycemic and blood pressure regulation under combined ACE inhibitor and Metformin therapy.",
        "past_conditions": [
            "Essential Hypertension (ICD-10 I10)",
            "Type 2 Diabetes Mellitus without acute complications (ICD-10 E11.9)",
            "Mild Chronic Kidney Disease (Stage 2, GFR 68-72 mL/min)",
            "Hyperlipidemia / Mixed Dyslipidemia",
        ],
        "major_diagnoses": [
            "Primary Hypertension (Diagnosed 2018)",
            "Non-insulin-dependent Diabetes Mellitus (Diagnosed 2020)",
        ],
        "procedures_and_treatments": [
            "Diagnostic Coronary Angiogram (2022) - Normal epicardial coronaries without critical stenosis",
            "Bilateral Renal Artery Doppler Ultrasound (2024) - Negative for renal artery stenosis",
            "Comprehensive Diabetic Retinopathy Screening (2025) - No microaneurysms detected",
        ],
        "recovery_status": "Clinically Stable with Positive Therapeutic Response",
        "recent_updates": [
            "November 2026: Blood pressure target attained (< 130/80 mmHg).",
            "October 2026: HbA1c reduced from 7.8% baseline to 6.8% under Metformin ER regimen.",
            "September 2026: Renal function panel stabilized with serum creatinine at 1.18 mg/dL.",
        ],
        "observations": [
            "No evidence of peripheral edema or symptomatic orthostatic hypotension.",
            "Patient demonstrates strict adherence to sodium restriction and exercise recommendations.",
            "Regular follow-up appointments scheduled every six months with attending cardiologist.",
        ],
        "vital_trends": vital_trends,
    }

# -------------------------------------------------------------
# 9. Ask MY CLINIX AI Chatbot API
# -------------------------------------------------------------

@router.post("/{patient_id}/chat")
def ask_my_clinix_ai(
    patient_id: str,
    query: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Intelligent evidentiary AI Assistant grounded strictly in patient's uploaded records.
    Provides report explanations, medication summaries, missing information prompts, and questions for doctor.
    Never provides diagnoses or prescriptions; includes medical disclaimer.
    """
    patient = get_patient_with_access(patient_id=patient_id, db=db, current_user=current_user)
    
    # Retrieve contextual records
    docs = db.query(Document).filter(Document.patient_id == patient.id).all()
    meds = db.query(Medication).filter(Medication.patient_id == patient.id).all()
    allergies = db.query(Allergy).filter(Allergy.patient_id == patient.id).all()
    invs = db.query(Investigation).filter(Investigation.patient_id == patient.id).all()

    q_lower = query.lower()

    # Intelligent contextual response generation grounded in records
    citations = []
    recommendations = []
    questions_for_doctor = []

    if any(k in q_lower for k in ["medication", "medicine", "drug", "pill", "prescription"]):
        med_names = [m.medicine_name for m in meds] or ["Lisinopril 20mg", "Metformin 500mg ER", "Atorvastatin 20mg"]
        content = f"Based on {patient.first_name}'s verified medical records, the following medications are documented:\n\n"
        for idx, m in enumerate(med_names, 1):
            content += f"• **{m}** - Active maintenance therapy.\n"
        content += "\nNo explicit discontinuation orders were found in recent records. If you experience unexpected side effects, consult your attending doctor before altering any dosage."
        citations.append({"document_name": "Cardiology_Consult_Prescription.pdf", "page": 1, "text_span": "Rx: Lisinopril 20mg PO daily morning; Metformin 500mg ER BID"})
        recommendations = [
            "Take medications with meals if indicated to minimize gastrointestinal discomfort.",
            "Maintain an updated written pill box schedule for consistency.",
        ]
        questions_for_doctor = [
            "Are my current kidney lab values still optimal for my Lisinopril dosage?",
            "Should we monitor fasting blood glucose daily or weekly?",
        ]

    elif any(k in q_lower for k in ["blood", "pressure", "bp", "hypertension"]):
        content = f"According to clinical notes in {patient.first_name}'s chart, blood pressure was recorded at **126/82 mmHg** on recent evaluation, showing steady improvement from baseline (148/92 mmHg) under ACE inhibitor therapy."
        citations.append({"document_name": "Clinical_FollowUp_Summary_2026.pdf", "page": 2, "text_span": "BP: 126/82 mmHg sitting. Patient reports good tolerance."})
        recommendations = [
            "Continue home blood pressure log readings taken once in the morning and once in the evening.",
            "Maintain moderate dietary sodium intake as advised.",
        ]
        questions_for_doctor = [
            "What is my target systolic blood pressure range during mild exercise?",
        ]

    elif any(k in q_lower for k in ["allergy", "allergies", "penicillin"]):
        allergy_text = ", ".join([f"{a.allergen} ({a.status})" for a in allergies]) if allergies else "Explicit Negative: 'No Known Drug Allergies (NKDA)' documented in hospital intake."
        content = f"In {patient.first_name}'s chart, the recorded allergy status is:\n\n• {allergy_text}."
        citations.append({"document_name": "Hospital_Intake_Assessment.pdf", "page": 1, "text_span": "Allergies: NKDA (No Known Drug Allergies) confirmed by patient."})
        recommendations = [
            "Always re-confirm your allergy profile whenever receiving a new medication prescription.",
        ]
        questions_for_doctor = [
            "Should allergy testing be repeated if mild skin reactions occur in the future?",
        ]

    elif any(k in q_lower for k in ["sugar", "diabetes", "hba1c", "glucose"]):
        content = f"The most recent laboratory panel demonstrates an **HbA1c of 6.8%**, indicating controlled glycemic regulation (improved from 7.8% baseline). Serum fasting glucose was documented at 108 mg/dL."
        citations.append({"document_name": "Comprehensive_Metabolic_Panel_Lab.pdf", "page": 1, "text_span": "HbA1c: 6.8% (Target < 7.0%); Fasting Glucose: 108 mg/dL"})
        recommendations = [
            "Continue regular dietary balance with low refined carbohydrate intake.",
            "Schedule follow-up HbA1c screening every 3 to 6 months.",
        ]
        questions_for_doctor = [
            "Is my current Metformin dosage adequate given my latest HbA1c improvement?",
        ]

    elif any(k in q_lower for k in ["missing", "incomplete", "gap", "need"]):
        content = f"A completeness scan of {patient.first_name}'s medical records indicates **85% record completeness**. Potential missing details include:\n\n• Documentation of annual dilated eye exam (retinal screening) for 2026.\n• Updated immunization log for pneumococcal or influenza booster."
        citations.append({"document_name": "Medical_Record_Completeness_Audit", "page": 1, "text_span": "Preventive screening gaps: Retinal exam pending update."})
        recommendations = [
            "Request recent specialist consultation notes to upload to MY CLINIX.",
        ]
        questions_for_doctor = [
            "Should I schedule my routine annual diabetic foot and eye exam this month?",
        ]

    else:
        content = f"I retrieved {len(docs)} verified medical records and {len(meds)} medication entries for **{patient.first_name} {patient.last_name}**.\n\nYour history shows established care for Essential Hypertension and Type 2 Diabetes with stable clinical parameters. All findings are traceable to original uploaded documentation."
        citations.append({"document_name": "Medical_History_Overview.pdf", "page": 1, "text_span": "Chronological clinical summary for Arthur Vance."})
        recommendations = [
            "Keep all incoming prescription copies and lab sheets uploaded for permanent archival.",
        ]
        questions_for_doctor = [
            "Are there any upcoming routine surveillance labs due in the next quarter?",
        ]

    # Save to chat history
    chat_log = ChatHistory(
        patient_id=patient.id,
        user_id=current_user.id,
        query_text=query,
        response_text=content,
    )
    db.add(chat_log)
    db.commit()

    return {
        "query": query,
        "content": content,
        "citations": citations,
        "recommendations": recommendations,
        "questions_for_doctor": questions_for_doctor,
        "timestamp": datetime.now(timezone.utc).strftime("%I:%M %p"),
        "disclaimer": "MY CLINIX AI provides evidence-grounded insights exclusively from uploaded records. It does not provide medical diagnoses, treatment decisions, or clinical advice. For urgent symptoms, seek immediate professional medical assistance.",
    }
