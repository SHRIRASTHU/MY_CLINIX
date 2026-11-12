from typing import Generator, Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.security import decode_access_token
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.patient_access import PatientAccess, AccessLevel

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    """Validate JWT token and retrieve the current authenticated user."""
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing user subject",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Authenticated user account no longer exists"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    return user

def require_role(*roles: str):
    """Enforce role-based access control at the route level."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role == UserRole.ADMIN.value:
            return current_user
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action forbidden. Requires one of roles: {', '.join(roles)}"
            )
        return current_user
    return role_checker

def get_patient_with_access(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    required_levels: Optional[List[str]] = None
) -> Patient:
    """
    Enforces strict patient-level data isolation.
    Ensures that only users explicitly authorized to view or manage
    the specified patient record can access it.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient record not found"
        )

    # Administrator has global audit access
    if current_user.role == UserRole.ADMIN.value:
        return patient

    # Check PatientAccess entry
    access = db.query(PatientAccess).filter(
        PatientAccess.patient_id == patient_id,
        PatientAccess.user_id == current_user.id
    ).first()

    if not access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to view or manage this patient's records"
        )

    if required_levels and access.access_level not in required_levels:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions: Requires {', '.join(required_levels)} access"
        )

    return patient
