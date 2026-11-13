from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime, timezone
from app.database.base import Base, TimestampMixin, generate_uuid


class ConsentRecord(Base, TimestampMixin):
    """
    Patient-controlled doctor authorization and consent management.
    Ensures doctors cannot automatically access medical records without explicit patient consent.
    Every grant and revocation is recorded for full evidentiary audit trail.
    """
    __tablename__ = "consent_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    doctor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    access_level: Mapped[str] = mapped_column(
        String(50), default="read_only", nullable=False
    )  # read_only, read_write, full

    # JSON-encoded array of allowed categories (e.g. '["prescription", "lab_report"]'), or None for all
    scope: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    granted_by_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )

    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_by_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    revocation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(
        String(50), default="active", nullable=False, index=True
    )  # active, revoked

    # Relationships
    patient = relationship("Patient", backref="consents")
    doctor = relationship("User", foreign_keys=[doctor_id])
    grantor = relationship("User", foreign_keys=[granted_by_id])
    revoker = relationship("User", foreign_keys=[revoked_by_id])
