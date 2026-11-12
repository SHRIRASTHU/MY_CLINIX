from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.patient_access import PatientAccess, AccessLevel
from app.models.records import Document, ExtractedFinding, Contradiction
from app.schemas.patient import (
    PatientCreate,
    PatientUpdate,
    PatientOut,
    PatientDetailOut,
    PatientAccessCreate,
    PatientAccessOut
)
from app.api.deps import get_current_user, get_patient_with_access

router = APIRouter()

@router.get("", response_model=List[PatientOut])
def list_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all patient profiles the current user is authorized to access.
    Admin users see all patients across the system.
    """
    if current_user.role == UserRole.ADMIN.value:
        patients = db.query(Patient).all()
        result = []
        for p in patients:
            docs_count = db.query(func.count(Document.id)).filter(Document.patient_id == p.id).scalar() or 0
            findings_count = db.query(func.count(ExtractedFinding.id)).filter(ExtractedFinding.patient_id == p.id).scalar() or 0
            contradictions_count = db.query(func.count(Contradiction.id)).filter(Contradiction.patient_id == p.id).scalar() or 0
            out = PatientOut.model_validate(p)
            out.access_level = "administrator"
            out.documents_count = docs_count
            out.findings_count = findings_count
            out.contradictions_count = contradictions_count
            result.append(out)
        return result

    # Regular users only see patients explicitly authorized in patient_access
    access_entries = (
        db.query(PatientAccess, Patient)
        .join(Patient, PatientAccess.patient_id == Patient.id)
        .filter(PatientAccess.user_id == current_user.id)
        .all()
    )

    result = []
    for access, patient in access_entries:
        docs_count = db.query(func.count(Document.id)).filter(Document.patient_id == patient.id).scalar() or 0
        findings_count = db.query(func.count(ExtractedFinding.id)).filter(ExtractedFinding.patient_id == patient.id).scalar() or 0
        contradictions_count = db.query(func.count(Contradiction.id)).filter(Contradiction.patient_id == patient.id).scalar() or 0
        out = PatientOut.model_validate(patient)
        out.access_level = access.access_level
        out.documents_count = docs_count
        out.findings_count = findings_count
        out.contradictions_count = contradictions_count
        result.append(out)
        
    return result

@router.post("", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def create_patient(
    patient_in: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new patient record and grant the current user owner access."""
    patient = Patient(
        first_name=patient_in.first_name.strip(),
        last_name=patient_in.last_name.strip(),
        date_of_birth=patient_in.date_of_birth.strip(),
        gender=patient_in.gender,
        blood_group=patient_in.blood_group,
        emergency_contact_name=patient_in.emergency_contact_name,
        emergency_contact_phone=patient_in.emergency_contact_phone,
        medical_notes=patient_in.medical_notes,
        created_by_id=current_user.id,
    )
    db.add(patient)
    db.flush()  # Generate patient.id

    # Automatically grant creator OWNER access
    access = PatientAccess(
        patient_id=patient.id,
        user_id=current_user.id,
        access_level=AccessLevel.OWNER
    )
    db.add(access)
    db.commit()
    db.refresh(patient)

    out = PatientOut.model_validate(patient)
    out.access_level = AccessLevel.OWNER
    out.documents_count = 0
    out.findings_count = 0
    out.contradictions_count = 0
    return out

@router.get("/{patient_id}", response_model=PatientDetailOut)
def get_patient_detail(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve detailed patient profile with access controls."""
    patient = get_patient_with_access(patient_id=patient_id, db=db, current_user=current_user)

    # Determine caller's access level
    access_level = "administrator" if current_user.role == UserRole.ADMIN.value else "viewer"
    access_record = db.query(PatientAccess).filter(
        PatientAccess.patient_id == patient.id,
        PatientAccess.user_id == current_user.id
    ).first()
    if access_record:
        access_level = access_record.access_level

    docs_count = db.query(func.count(Document.id)).filter(Document.patient_id == patient.id).scalar() or 0
    findings_count = db.query(func.count(ExtractedFinding.id)).filter(ExtractedFinding.patient_id == patient.id).scalar() or 0
    contradictions_count = db.query(func.count(Contradiction.id)).filter(Contradiction.patient_id == patient.id).scalar() or 0

    access_entries = (
        db.query(PatientAccess, User)
        .join(User, PatientAccess.user_id == User.id)
        .filter(PatientAccess.patient_id == patient.id)
        .all()
    )
    
    access_list = [
        PatientAccessOut(
            id=acc.id,
            user_id=acc.user_id,
            patient_id=acc.patient_id,
            access_level=acc.access_level,
            user_email=u.email,
            user_name=u.full_name
        )
        for acc, u in access_entries
    ]

    out = PatientDetailOut.model_validate(patient)
    out.access_level = access_level
    out.documents_count = docs_count
    out.findings_count = findings_count
    out.contradictions_count = contradictions_count
    out.access_list = access_list
    return out

@router.put("/{patient_id}", response_model=PatientOut)
def update_patient(
    patient_id: str,
    patient_in: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update patient demographic and medical profile."""
    patient = get_patient_with_access(
        patient_id=patient_id,
        db=db,
        current_user=current_user,
        required_levels=[AccessLevel.OWNER, AccessLevel.CAREGIVER]
    )

    update_data = patient_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(patient, field, value)

    db.commit()
    db.refresh(patient)

    docs_count = db.query(func.count(Document.id)).filter(Document.patient_id == patient.id).scalar() or 0
    findings_count = db.query(func.count(ExtractedFinding.id)).filter(ExtractedFinding.patient_id == patient.id).scalar() or 0
    contradictions_count = db.query(func.count(Contradiction.id)).filter(Contradiction.patient_id == patient.id).scalar() or 0

    out = PatientOut.model_validate(patient)
    out.documents_count = docs_count
    out.findings_count = findings_count
    out.contradictions_count = contradictions_count
    return out

@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete patient record (Owner or Administrator only)."""
    patient = get_patient_with_access(
        patient_id=patient_id,
        db=db,
        current_user=current_user,
        required_levels=[AccessLevel.OWNER]
    )

    db.delete(patient)
    db.commit()
    return None

@router.post("/{patient_id}/access", response_model=PatientAccessOut, status_code=status.HTTP_201_CREATED)
def grant_patient_access(
    patient_id: str,
    access_in: PatientAccessCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Grant another registered user access to this patient record."""
    patient = get_patient_with_access(
        patient_id=patient_id,
        db=db,
        current_user=current_user,
        required_levels=[AccessLevel.OWNER]
    )

    target_user = db.query(User).filter(User.email == access_in.user_email.lower().strip()).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No user found with email address: {access_in.user_email}"
        )

    # Check existing access
    existing = db.query(PatientAccess).filter(
        PatientAccess.patient_id == patient.id,
        PatientAccess.user_id == target_user.id
    ).first()

    if existing:
        existing.access_level = access_in.access_level
        db.commit()
        db.refresh(existing)
        return PatientAccessOut(
            id=existing.id,
            user_id=target_user.id,
            patient_id=patient.id,
            access_level=existing.access_level,
            user_email=target_user.email,
            user_name=target_user.full_name
        )

    new_access = PatientAccess(
        patient_id=patient.id,
        user_id=target_user.id,
        access_level=access_in.access_level
    )
    db.add(new_access)
    db.commit()
    db.refresh(new_access)

    return PatientAccessOut(
        id=new_access.id,
        user_id=target_user.id,
        patient_id=patient.id,
        access_level=new_access.access_level,
        user_email=target_user.email,
        user_name=target_user.full_name
    )
