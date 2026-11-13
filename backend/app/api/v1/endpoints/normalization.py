"""
Universal Medical Normalization Engine - API Endpoints
Provides cross-border medical normalization, destination-aware travel mode,
emergency passport QR generation, and region-aware lab interpretations.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.patient import Patient
from app.models.records import (
    Document,
    ExtractedFinding,
    Medication,
    Allergy,
    Investigation,
    Contradiction,
)
from app.api.deps import get_current_user, get_patient_with_access
from app.core.normalization.engine import UniversalMedicalNormalizationEngine as Normalizer
from app.schemas.normalization import (
    UnitConversionRequest,
    UnitConversionResponse,
    ContextDetectionRequest,
    ContextDetectionResponse,
    DateNormalizationRequest,
    DateNormalizationResponse,
    TermNormalizationRequest,
    TermNormalizationResponse,
    TravelSummaryResponse,
    EmergencyPassportResponse,
)

router = APIRouter()

@router.get("/countries", response_model=List[Dict[str, Any]])
def get_supported_countries(
    current_user: User = Depends(get_current_user)
):
    """Retrieve all supported country profiles, preferred units, and emergency dispatch numbers."""
    return Normalizer.get_supported_countries()

@router.post("/convert-unit", response_model=UnitConversionResponse)
def convert_unit(
    req: UnitConversionRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Intelligently converts clinical units (mg/dL <-> mmol/L, kg <-> lb, cm <-> in, °C <-> °F).
    Analyte-aware conversion uses exact molecular weights.
    """
    res = Normalizer.normalize_unit(
        value=req.value,
        from_unit=req.from_unit,
        to_unit=req.to_unit,
        analyte_key=req.analyte,
        destination_country=req.destination_country,
    )
    return res

@router.post("/detect-context", response_model=ContextDetectionResponse)
def detect_document_context(
    req: ContextDetectionRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Auto-detects document language (English, Hindi, Bengali, Tamil, Telugu, Arabic, German, French)
    and country context from text and institutional footprints.
    """
    return Normalizer.detect_language_and_country(text=req.text, file_name=req.file_name or "")

@router.post("/normalize-date", response_model=DateNormalizationResponse)
def normalize_date(
    req: DateNormalizationRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Context-aware date disambiguation (DD/MM/YYYY vs MM/DD/YYYY) based on origin country.
    """
    return Normalizer.normalize_date(date_str=req.date_str, country_context=req.country_context or "IN")

@router.post("/normalize-term", response_model=TermNormalizationResponse)
def normalize_clinical_term(
    req: TermNormalizationRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Maps multilingual or vernacular terms (e.g. 'शुगर', 'Blutzucker', 'Paracetamol')
    to standardized LOINC, SNOMED CT, ICD-10, and RxNorm concepts while preserving original phrasing.
    """
    return Normalizer.normalize_clinical_term(raw_term=req.raw_term)

@router.get("/patient/{patient_id}/travel-summary", response_model=TravelSummaryResponse)
def get_patient_travel_summary(
    patient_id: str,
    destination_country: str = Query("US", description="Target destination country code (e.g. US, GB, IN, DE, AE)"),
    origin_country: str = Query("IN", description="Origin country code"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generates a Destination-Aware Medical Travel Summary for a patient.
    Translates medications to local equivalents (e.g. Paracetamol -> Acetaminophen/Tylenol),
    normalizes lab test units, and provides destination emergency contact data.
    """
    patient = get_patient_with_access(patient_id=patient_id, db=db, current_user=current_user)

    # Fetch patient records
    meds = db.query(Medication).filter(Medication.patient_id == patient.id).all()
    investigations = db.query(Investigation).filter(Investigation.patient_id == patient.id).all()
    allergies = db.query(Allergy).filter(Allergy.patient_id == patient.id).all()
    documents = db.query(Document).filter(Document.patient_id == patient.id).all()

    patient_dict = {
        "id": patient.id,
        "first_name": patient.first_name,
        "last_name": patient.last_name,
        "date_of_birth": patient.date_of_birth,
        "gender": patient.gender,
        "blood_group": patient.blood_group,
        "emergency_contact_name": patient.emergency_contact_name,
        "emergency_contact_phone": patient.emergency_contact_phone,
        "medical_notes": patient.medical_notes,
    }

    med_dicts = [
        {
            "id": m.id,
            "medicine_name": m.medicine_name,
            "dosage": m.dosage,
            "frequency": m.frequency,
            "route": m.route,
            "status": m.status,
            "start_date": m.start_date,
        }
        for m in meds
    ]

    inv_dicts = [
        {
            "id": inv.id,
            "test_name": inv.test_name,
            "result_value": inv.result_value,
            "original_unit": inv.original_unit or "",
            "reference_range": inv.reference_range or "",
            "abnormal_flag": inv.abnormal_flag,
            "test_date": inv.test_date,
        }
        for inv in investigations
    ]

    allergy_dicts = [
        {
            "id": a.id,
            "allergen": a.allergen,
            "reaction": a.reaction,
            "severity": a.severity,
            "status": a.status,
            "recorded_date": a.recorded_date,
        }
        for a in allergies
    ]

    doc_dicts = [
        {
            "id": d.id,
            "file_name": d.file_name,
            "document_type": d.document_type,
            "document_date": d.document_date,
        }
        for d in documents
    ]

    summary = Normalizer.generate_travel_summary(
        patient_data=patient_dict,
        origin_country=origin_country,
        destination_country=destination_country,
        documents=doc_dicts,
        investigations=inv_dicts,
        medications=med_dicts,
        allergies=allergy_dicts,
    )
    return summary

@router.get("/patient/{patient_id}/emergency-passport", response_model=EmergencyPassportResponse)
def get_patient_emergency_passport(
    patient_id: str,
    destination_country: str = Query("US", description="Destination country code"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generates a QR-based / offline-compatible Emergency Medical Passport.
    Contains critical allergies, blood group, emergency contact, medications, and local 911/999/112 dial number.
    Usable 100% offline without internet connection.
    """
    patient = get_patient_with_access(patient_id=patient_id, db=db, current_user=current_user)

    allergies = db.query(Allergy).filter(Allergy.patient_id == patient.id).all()
    medications = db.query(Medication).filter(Medication.patient_id == patient.id).all()

    patient_dict = {
        "id": patient.id,
        "first_name": patient.first_name,
        "last_name": patient.last_name,
        "date_of_birth": patient.date_of_birth,
        "gender": patient.gender,
        "blood_group": patient.blood_group,
        "emergency_contact_name": patient.emergency_contact_name,
        "emergency_contact_phone": patient.emergency_contact_phone,
    }

    allergy_dicts = [
        {"allergen": a.allergen, "reaction": a.reaction, "status": a.status}
        for a in allergies
    ]

    med_dicts = [
        {"medicine_name": m.medicine_name, "dosage": m.dosage}
        for m in medications
    ]

    passport = Normalizer.generate_emergency_passport(
        patient_data=patient_dict,
        destination_country=destination_country,
        allergies=allergy_dicts,
        medications=med_dicts,
    )
    return passport

@router.get("/patient/{patient_id}/cross-border-audit")
def get_cross_border_audit(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Runs a cross-border audit comparing records from different countries (India, UK, US, Germany),
    highlighting detected contradictions, unit variations, and reference range differences with exact provenance.
    """
    patient = get_patient_with_access(patient_id=patient_id, db=db, current_user=current_user)

    findings = db.query(ExtractedFinding).filter(ExtractedFinding.patient_id == patient.id).all()
    docs = db.query(Document).filter(Document.patient_id == patient.id).all()
    doc_map = {d.id: d.file_name for d in docs}

    finding_dicts = []
    for f in findings:
        finding_dicts.append({
            "id": f.id,
            "entity_name": f.entity_name,
            "extracted_value": f.extracted_value,
            "original_extracted_text": f.original_extracted_text,
            "source_page_number": f.source_page_number,
            "document_id": f.document_id,
            "document_name": doc_map.get(f.document_id, "Clinical Report"),
            "event_date": f.event_date,
            "extraction_confidence": f.extraction_confidence,
            "polarity": f.polarity,
            "finding_category": f.finding_category,
        })

    conflicts = Normalizer.detect_cross_border_conflicts(patient_id=patient.id, findings=finding_dicts)

    return {
        "patient_id": patient.id,
        "patient_name": f"{patient.first_name} {patient.last_name}",
        "total_cross_border_findings": len(findings),
        "conflicts_detected": conflicts,
        "provenance_records": finding_dicts,
        "interoperability_standard": "Universal Medical Normalization Engine v2.0 (LOINC / RxNorm / ISO-8601)",
    }
