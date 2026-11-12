from sqlalchemy import String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, TimestampMixin, generate_uuid

class AccessLevel:
    OWNER = "owner"
    CAREGIVER = "caregiver"
    REVIEWER = "reviewer"
    VIEWER = "viewer"

class PatientAccess(Base, TimestampMixin):
    __tablename__ = "patient_access"
    __table_args__ = (
        UniqueConstraint("patient_id", "user_id", name="uq_patient_user_access"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    access_level: Mapped[str] = mapped_column(String(50), default=AccessLevel.VIEWER, nullable=False)

    # Relationships
    patient = relationship("Patient", back_populates="accesses")
    user = relationship("User", back_populates="patient_accesses")
