import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.patient_access import PatientAccess, AccessLevel
from app.models.consent import ConsentRecord
from app.api.deps import get_current_user, get_patient_with_access
from app.services.audit_service import log_event

router = APIRouter()


class ConsentGrantRequest(BaseModel):
    doctor_id: str
    access_level: str = Field("read_only", description="read_only, read_write, full")
    scope: Optional[List[str]] = Field(None, description="Allowed document types, None = all")


class ConsentRevokeRequest(BaseModel):
    reason: Optional[str] = Field(None, description="Reason for revoking consent")


class ConsentRecordOut(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    doctor_name: Optional[str] = None
    doctor_email: Optional[str] = None
    access_level: str
    scope: Optional[List[str]] = None
    granted_at: str
    revoked_at: Optional[str] = None
    revocation_reason: Optional[str] = None
    status: str


class DoctorLookupOut(BaseModel):
    id: str
    full_name: str
    email: str
    is_verified: bool


@router.get("/doctors", response_model=List[DoctorLookupOut])
def list_available_doctors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List verified doctors available for patient consent authorization.
    Enables patient to search and grant consent to a licensed physician.
    """
    doctors = db.query(User).filter(
        User.role == UserRole.DOCTOR.value,
        User.is_active == True,
    ).all()
    return [
        DoctorLookupOut(
            id=d.id,
            full_name=d.full_name,
            email=d.email,
            is_verified=d.is_verified,
        )
        for d in doctors
    ]


@router.get("/patients/{patient_id}/consent", response_model=List[ConsentRecordOut])
def list_patient_consent_records(
    patient_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all active and historical doctor access consent authorizations for a patient.
    """
    patient = get_patient_with_access(patient_id=patient_id, db=db, current_user=current_user)

    records = db.query(ConsentRecord).filter(
        ConsentRecord.patient_id == patient.id
    ).order_by(ConsentRecord.granted_at.desc()).all()

    results = []
    for r in records:
        doc_user = db.query(User).filter(User.id == r.doctor_id).first()
        scope_list = json.loads(r.scope) if r.scope else None
        results.append(
            ConsentRecordOut(
                id=r.id,
                patient_id=r.patient_id,
                doctor_id=r.doctor_id,
                doctor_name=doc_user.full_name if doc_user else "Unknown Doctor",
                doctor_email=doc_user.email if doc_user else None,
                access_level=r.access_level,
                scope=scope_list,
                granted_at=r.granted_at.isoformat(),
                revoked_at=r.revoked_at.isoformat() if r.revoked_at else None,
                revocation_reason=r.revocation_reason,
                status=r.status,
            )
        )

    log_event(
        db,
        action="patient_consent_view",
        actor_id=current_user.id,
        actor_role=current_user.role,
        patient_id=patient.id,
        request=request,
    )
    return results


@router.post("/patients/{patient_id}/consent/grant", response_model=ConsentRecordOut, status_code=status.HTTP_201_CREATED)
def grant_doctor_consent(
    patient_id: str,
    payload: ConsentGrantRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Patient grants explicit access to a doctor with configurable scope and permissions.
    Only patient owner or administrator may grant consent.
    """
    # Enforce owner/admin permission
    patient = get_patient_with_access(patient_id=patient_id, db=db, current_user=current_user)
    if current_user.role != UserRole.ADMIN.value:
        owner_access = db.query(PatientAccess).filter(
            PatientAccess.patient_id == patient.id,
            PatientAccess.user_id == current_user.id,
            PatientAccess.access_level.in_([AccessLevel.OWNER, AccessLevel.ADMINISTRATOR]),
        ).first()
        if not owner_access and patient.created_by_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the patient or legal owner can grant doctor access permissions."
            )

    # Verify target doctor exists
    doctor = db.query(User).filter(
        User.id == payload.doctor_id,
        User.role == UserRole.DOCTOR.value,
        User.is_active == True,
    ).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Specified doctor account not found or is inactive."
        )

    # Supersede any previous active consent for this doctor
    active_prev = db.query(ConsentRecord).filter(
        ConsentRecord.patient_id == patient.id,
        ConsentRecord.doctor_id == doctor.id,
        ConsentRecord.status == "active",
    ).all()
    for prev in active_prev:
        prev.status = "revoked"
        prev.revoked_at = datetime.now(timezone.utc)
        prev.revoked_by_id = current_user.id
        prev.revocation_reason = "Superseded by updated consent grant"

    scope_str = json.dumps(payload.scope) if payload.scope else None

    # Create immutable ConsentRecord
    consent = ConsentRecord(
        patient_id=patient.id,
        doctor_id=doctor.id,
        access_level=payload.access_level,
        scope=scope_str,
        granted_at=datetime.now(timezone.utc),
        granted_by_id=current_user.id,
        status="active",
    )
    db.add(consent)

    # Create or update PatientAccess entry
    access = db.query(PatientAccess).filter(
        PatientAccess.patient_id == patient.id,
        PatientAccess.user_id == doctor.id,
    ).first()

    if not access:
        access = PatientAccess(
            patient_id=patient.id,
            user_id=doctor.id,
            access_level=AccessLevel.DOCTOR,
        )
        db.add(access)
    else:
        access.access_level = AccessLevel.DOCTOR

    db.commit()
    db.refresh(consent)

    log_event(
        db,
        action="consent_grant",
        actor_id=current_user.id,
        actor_role=current_user.role,
        patient_id=patient.id,
        request=request,
        extra={
            "doctor_id": doctor.id,
            "access_level": payload.access_level,
            "scope": payload.scope,
        },
    )

    return ConsentRecordOut(
        id=consent.id,
        patient_id=consent.patient_id,
        doctor_id=consent.doctor_id,
        doctor_name=doctor.full_name,
        doctor_email=doctor.email,
        access_level=consent.access_level,
        scope=payload.scope,
        granted_at=consent.granted_at.isoformat(),
        status=consent.status,
    )


@router.post("/patients/{patient_id}/consent/revoke/{doctor_id}", response_model=ConsentRecordOut)
def revoke_doctor_consent(
    patient_id: str,
    doctor_id: str,
    payload: ConsentRevokeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Patient or administrator explicitly revokes doctor access to medical records.
    Removes PatientAccess immediately to prevent further access.
    """
    patient = get_patient_with_access(patient_id=patient_id, db=db, current_user=current_user)
    if current_user.role != UserRole.ADMIN.value:
        owner_access = db.query(PatientAccess).filter(
            PatientAccess.patient_id == patient.id,
            PatientAccess.user_id == current_user.id,
            PatientAccess.access_level.in_([AccessLevel.OWNER, AccessLevel.ADMINISTRATOR]),
        ).first()
        if not owner_access and patient.created_by_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the patient or legal owner can revoke doctor access permissions."
            )

    active_consents = db.query(ConsentRecord).filter(
        ConsentRecord.patient_id == patient.id,
        ConsentRecord.doctor_id == doctor_id,
        ConsentRecord.status == "active",
    ).all()

    now = datetime.now(timezone.utc)
    last_record = None
    for c in active_consents:
        c.status = "revoked"
        c.revoked_at = now
        c.revoked_by_id = current_user.id
        c.revocation_reason = payload.reason or "Revoked by patient request"
        last_record = c

    # Delete PatientAccess row so doctor cannot query or view records anymore
    db.query(PatientAccess).filter(
        PatientAccess.patient_id == patient.id,
        PatientAccess.user_id == doctor_id,
    ).delete()

    db.commit()

    doctor = db.query(User).filter(User.id == doctor_id).first()

    log_event(
        db,
        action="consent_revoke",
        actor_id=current_user.id,
        actor_role=current_user.role,
        patient_id=patient.id,
        request=request,
        extra={"doctor_id": doctor_id, "reason": payload.reason},
    )

    if last_record:
        return ConsentRecordOut(
            id=last_record.id,
            patient_id=last_record.patient_id,
            doctor_id=last_record.doctor_id,
            doctor_name=doctor.full_name if doctor else "Doctor",
            doctor_email=doctor.email if doctor else None,
            access_level=last_record.access_level,
            granted_at=last_record.granted_at.isoformat(),
            revoked_at=now.isoformat(),
            revocation_reason=last_record.revocation_reason,
            status="revoked",
        )

    # If no active consent record found, return confirmation
    return ConsentRecordOut(
        id="revoked",
        patient_id=patient.id,
        doctor_id=doctor_id,
        doctor_name=doctor.full_name if doctor else "Doctor",
        doctor_email=doctor.email if doctor else None,
        access_level="none",
        granted_at=now.isoformat(),
        revoked_at=now.isoformat(),
        revocation_reason=payload.reason or "Revoked by patient request",
        status="revoked",
    )
