import enum
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base, TimestampMixin, generate_uuid

class UserRole(str, enum.Enum):
    ADMIN = "administrator"
    DOCTOR = "doctor"
    PATIENT = "patient"

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default=UserRole.PATIENT.value, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    patient_accesses = relationship("PatientAccess", back_populates="user", cascade="all, delete-orphan")
    created_patients = relationship("Patient", back_populates="creator")
    reviews_conducted = relationship("ReviewHistory", back_populates="reviewer")
    chat_queries = relationship("ChatHistory", back_populates="user")
