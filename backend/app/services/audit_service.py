import json
import hashlib
import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import Request
from app.models.audit import AuditLog

logger = logging.getLogger("myclinix.audit")


def get_client_ip(request: Optional[Request]) -> Optional[str]:
    """Safely extract the origin client IP address from request headers."""
    if not request:
        return None
    # Check standard proxy headers
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # First IP in list is original client
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    if request.client:
        return request.client.host
    return None


def get_user_agent_hash(request: Optional[Request]) -> Optional[str]:
    """Store SHA-256 hash of User-Agent string to avoid storing raw browser fingerprints."""
    if not request:
        return None
    ua = request.headers.get("User-Agent")
    if not ua:
        return None
    return hashlib.sha256(ua.encode("utf-8")).hexdigest()


def log_event(
    db: Session,
    action: str,
    actor_id: Optional[str] = None,
    actor_role: Optional[str] = None,
    patient_id: Optional[str] = None,
    document_id: Optional[str] = None,
    outcome: str = "success",
    request: Optional[Request] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> Optional[AuditLog]:
    """
    Record an immutable audit log entry.
    Never throws exceptions to avoid breaking clinical workflows if audit write fails.
    Never logs passwords, tokens, full document contents, or raw PII.
    """
    try:
        ip = get_client_ip(request)
        ua_hash = get_user_agent_hash(request)
        extra_json = json.dumps(extra) if extra else None

        entry = AuditLog(
            action=action,
            actor_id=actor_id,
            actor_role=actor_role,
            patient_id=patient_id,
            document_id=document_id,
            outcome=outcome,
            request_ip=ip,
            user_agent_hash=ua_hash,
            extra_context=extra_json,
        )
        db.add(entry)
        db.commit()
        return entry
    except Exception as exc:
        db.rollback()
        logger.error(f"Audit log write failed for action='{action}': {exc}", exc_info=True)
        return None
