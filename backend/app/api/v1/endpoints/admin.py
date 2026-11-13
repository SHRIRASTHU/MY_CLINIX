from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.database.session import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.records import Document, Contradiction
from app.models.audit import AuditLog
from app.schemas.user import UserOut
from app.api.deps import require_role
from app.services.audit_service import log_event

router = APIRouter()

class AuditLogItemOut(BaseModel):
    id: str
    action: str
    outcome: str
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    actor_email: Optional[str] = None
    actor_role: Optional[str] = None
    patient_id: Optional[str] = None
    document_id: Optional[str] = None
    request_ip: Optional[str] = None
    created_at: str
    extra_context: Optional[str] = None

class PaginatedAuditLogsOut(BaseModel):
    items: List[AuditLogItemOut]
    total: int
    page: int
    page_size: int
    total_pages: int

@router.get("/users", response_model=List[UserOut])
def list_users(
    role: Optional[str] = Query(None, description="Filter by role: administrator, doctor, patient"),
    search: Optional[str] = Query(None, description="Search name or email"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(UserRole.ADMIN.value)),
):
    """Administrator-only: List all system accounts across the platform."""
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if search:
        search_pattern = f"%{search.strip().lower()}%"
        query = query.filter(
            (func.lower(User.email).like(search_pattern)) | 
            (func.lower(User.full_name).like(search_pattern))
        )
    return query.order_by(User.created_at.desc()).all()

@router.patch("/users/{user_id}/verify-doctor", response_model=UserOut)
def verify_doctor(
    user_id: str,
    is_verified: bool = Query(..., description="Set doctor verification status"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(UserRole.ADMIN.value)),
):
    """Administrator-only: Verify or revoke doctor verification credential."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found")
    if target_user.role != UserRole.DOCTOR.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Verification status can only be updated for doctor accounts"
        )
    target_user.is_verified = is_verified
    db.commit()
    db.refresh(target_user)
    return target_user

@router.patch("/users/{user_id}/status", response_model=UserOut)
def update_user_status(
    user_id: str,
    is_active: bool = Query(..., description="Activate or deactivate user account"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(UserRole.ADMIN.value)),
):
    """Administrator-only: Activate or deactivate a user account."""
    if user_id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrator cannot deactivate their own account"
        )
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found")
    target_user.is_active = is_active
    db.commit()
    db.refresh(target_user)
    return target_user

@router.get("/stats")
def get_admin_platform_stats(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(UserRole.ADMIN.value)),
):
    """Administrator-only: Global platform overview and governance metrics."""
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_doctors = db.query(func.count(User.id)).filter(User.role == UserRole.DOCTOR.value).scalar() or 0
    verified_doctors = db.query(func.count(User.id)).filter(
        User.role == UserRole.DOCTOR.value, 
        User.is_verified == True
    ).scalar() or 0
    total_patients_users = db.query(func.count(User.id)).filter(User.role == UserRole.PATIENT.value).scalar() or 0
    total_patient_profiles = db.query(func.count(Patient.id)).scalar() or 0
    total_documents = db.query(func.count(Document.id)).scalar() or 0
    open_conflicts = db.query(func.count(Contradiction.id)).filter(Contradiction.status == "unresolved").scalar() or 0

    return {
        "total_users": total_users,
        "total_doctors": total_doctors,
        "verified_doctors": verified_doctors,
        "total_patient_users": total_patients_users,
        "total_patient_profiles": total_patient_profiles,
        "total_documents": total_documents,
        "open_conflicts": open_conflicts,
    }

@router.get("/audit-logs", response_model=PaginatedAuditLogsOut)
def get_system_audit_logs(
    request: Request,
    action: Optional[str] = Query(None, description="Filter by audit action"),
    actor_id: Optional[str] = Query(None, description="Filter by actor ID"),
    patient_id: Optional[str] = Query(None, description="Filter by patient ID"),
    outcome: Optional[str] = Query(None, description="Filter by outcome (success, failure, blocked)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(UserRole.ADMIN.value)),
):
    """
    Administrator-only: Query system-wide immutable audit logs for compliance & security review.
    """
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if actor_id:
        query = query.filter(AuditLog.actor_id == actor_id)
    if patient_id:
        query = query.filter(AuditLog.patient_id == patient_id)
    if outcome:
        query = query.filter(AuditLog.outcome == outcome)

    total = query.count()
    offset = (page - 1) * page_size
    entries = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(page_size).all()

    items = []
    for entry in entries:
        actor = db.query(User).filter(User.id == entry.actor_id).first() if entry.actor_id else None
        items.append(
            AuditLogItemOut(
                id=entry.id,
                action=entry.action,
                outcome=entry.outcome,
                actor_id=entry.actor_id,
                actor_name=actor.full_name if actor else None,
                actor_email=actor.email if actor else None,
                actor_role=entry.actor_role,
                patient_id=entry.patient_id,
                document_id=entry.document_id,
                request_ip=entry.request_ip,
                created_at=entry.created_at.isoformat(),
                extra_context=entry.extra_context,
            )
        )

    log_event(
        db,
        action="admin_audit_logs_view",
        actor_id=admin_user.id,
        actor_role=admin_user.role,
        request=request,
        extra={"page": page, "page_size": page_size, "filter_action": action}
    )

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return PaginatedAuditLogsOut(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
