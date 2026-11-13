from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional
from datetime import datetime, timezone
from app.database.base import Base, generate_uuid


class AuditLog(Base):
    """
    Immutable audit trail for security-sensitive actions in MY CLINIX.
    NEVER store: passwords, tokens, full document content, or raw PII.
    IP addresses are stored as-is for now (consider hashing in production).
    User-Agent is stored as sha256 hash only.
    """
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)

    # Actor — nullable because some events (e.g. failed login for unknown user) may have no actor
    actor_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    actor_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Subject
    patient_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    document_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # Event
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    outcome: Mapped[str] = mapped_column(String(50), nullable=False, default="success")

    # Request metadata
    request_ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_agent_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Non-sensitive metadata (JSON blob)
    extra_context: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
