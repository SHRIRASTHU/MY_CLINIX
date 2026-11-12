from sqlalchemy import String, Date, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List
from app.database.base import Base, TimestampMixin, generate_uuid

class Patient(Base, TimestampMixin):
    __tablename__ = "patients"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_birth: Mapped[str] = mapped_column(String(20), nullable=False) # Store YYYY-MM-DD
    gender: Mapped[str] = mapped_column(String(20), default="unknown", nullable=False)
    blood_group: Mapped[str] = mapped_column(String(10), default="unknown", nullable=False)
    emergency_contact_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    emergency_contact_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    medical_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Creator
    created_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    creator = relationship("User", back_populates="created_patients")

    # Access control & isolation
    accesses = relationship("PatientAccess", back_populates="patient", cascade="all, delete-orphan")
    
    # Records
    documents = relationship("Document", back_populates="patient", cascade="all, delete-orphan")
    findings = relationship("ExtractedFinding", back_populates="patient", cascade="all, delete-orphan")
    events = relationship("MedicalEvent", back_populates="patient", cascade="all, delete-orphan")
    medications = relationship("Medication", back_populates="patient", cascade="all, delete-orphan")
    allergies = relationship("Allergy", back_populates="patient", cascade="all, delete-orphan")
    investigations = relationship("Investigation", back_populates="patient", cascade="all, delete-orphan")
    contradictions = relationship("Contradiction", back_populates="patient", cascade="all, delete-orphan")
    duplicates = relationship("DuplicateRecord", back_populates="patient", cascade="all, delete-orphan")
    chat_history = relationship("ChatHistory", back_populates="patient", cascade="all, delete-orphan")
