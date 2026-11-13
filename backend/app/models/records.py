from sqlalchemy import String, Integer, Float, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime, timezone
from app.database.base import Base, TimestampMixin, generate_uuid

class Document(Base, TimestampMixin):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    uploader_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    sha256_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    
    # Document categorization & dates
    document_type: Mapped[str] = mapped_column(String(100), default="other", nullable=False) # prescription, lab_report, etc.
    document_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # Clinically recorded date
    upload_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Processing state
    processing_status: Mapped[str] = mapped_column(String(50), default="uploaded", nullable=False) # uploaded, processing, completed, failed
    ocr_extracted_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    page_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    
    # Relationships
    patient = relationship("Patient", back_populates="documents")
    uploader = relationship("User")
    findings = relationship("ExtractedFinding", back_populates="document", cascade="all, delete-orphan")
    events = relationship("MedicalEvent", back_populates="document")
    medications = relationship("Medication", back_populates="document")
    allergies = relationship("Allergy", back_populates="document")
    investigations = relationship("Investigation", back_populates="document")

class ExtractedFinding(Base, TimestampMixin):
    __tablename__ = "extracted_findings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    
    finding_category: Mapped[str] = mapped_column(String(100), nullable=False) # condition, medication, allergy, investigation, admission
    entity_name: Mapped[str] = mapped_column(String(255), nullable=False)
    extracted_value: Mapped[str] = mapped_column(Text, nullable=False)
    original_extracted_text: Mapped[str] = mapped_column(Text, nullable=False) # Exact source passage for verification
    source_page_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    text_span_start: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    text_span_end: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    event_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    date_precision: Mapped[str] = mapped_column(String(50), default="unknown", nullable=False) # exact, month_year, year_only, approximate, unknown
    extraction_confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    verification_status: Mapped[str] = mapped_column(String(50), default="unverified", nullable=False) # unverified, confirmed, corrected, flagged_incorrect, requires_review
    polarity: Mapped[str] = mapped_column(String(50), default="positive", nullable=False) # positive, negative, not_documented, unclear

    # Relationships
    patient = relationship("Patient", back_populates="findings")
    document = relationship("Document", back_populates="findings")
    reviews = relationship("ReviewHistory", back_populates="finding", cascade="all, delete-orphan")

class MedicalEvent(Base, TimestampMixin):
    __tablename__ = "medical_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    finding_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("extracted_findings.id", ondelete="SET NULL"), nullable=True)

    event_type: Mapped[str] = mapped_column(String(100), nullable=False) # condition, medication_event, allergy, lab_investigation, scan, consultation, admission
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    event_date: Mapped[str] = mapped_column(String(50), nullable=False)
    event_date_precision: Mapped[str] = mapped_column(String(50), default="exact", nullable=False)
    verification_status: Mapped[str] = mapped_column(String(50), default="unverified", nullable=False)

    patient = relationship("Patient", back_populates="events")
    document = relationship("Document", back_populates="events")

class Medication(Base, TimestampMixin):
    __tablename__ = "medications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    finding_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("extracted_findings.id", ondelete="SET NULL"), nullable=True)

    medicine_name: Mapped[str] = mapped_column(String(255), nullable=False)
    dosage: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    frequency: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    route: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="started", nullable=False) # started, changed, explicitly_discontinued, historical, unknown, requires_review
    start_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    stop_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    discontinuation_evidence: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    patient = relationship("Patient", back_populates="medications")
    document = relationship("Document", back_populates="medications")

class Allergy(Base, TimestampMixin):
    __tablename__ = "allergies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    finding_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("extracted_findings.id", ondelete="SET NULL"), nullable=True)

    allergen: Mapped[str] = mapped_column(String(255), nullable=False)
    reaction: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    severity: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="explicit_positive", nullable=False) # explicit_positive, explicit_negative, unclear
    recorded_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    patient = relationship("Patient", back_populates="allergies")
    document = relationship("Document", back_populates="allergies")

class Investigation(Base, TimestampMixin):
    __tablename__ = "investigations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    finding_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("extracted_findings.id", ondelete="SET NULL"), nullable=True)

    test_name: Mapped[str] = mapped_column(String(255), nullable=False)
    result_value: Mapped[str] = mapped_column(String(100), nullable=False)
    original_unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    reference_range: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    abnormal_flag: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    test_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    patient = relationship("Patient", back_populates="investigations")
    document = relationship("Document", back_populates="investigations")

class Contradiction(Base, TimestampMixin):
    __tablename__ = "contradictions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False) # allergy, investigation, medication, dates, statement
    finding_a_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("extracted_findings.id", ondelete="SET NULL"), nullable=True)
    finding_b_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("extracted_findings.id", ondelete="SET NULL"), nullable=True)
    document_a_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    document_b_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="unresolved", nullable=False) # unresolved, reviewed_resolved, dismissed
    reviewer_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_by_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    patient = relationship("Patient", back_populates="contradictions")

class DuplicateRecord(Base, TimestampMixin):
    __tablename__ = "duplicates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    original_document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    duplicate_document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    duplicate_type: Mapped[str] = mapped_column(String(50), default="exact_hash", nullable=False) # exact_hash, semantic_similarity
    similarity_score: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    review_status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)

    patient = relationship("Patient", back_populates="duplicates")

class ReviewHistory(Base):
    __tablename__ = "review_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    finding_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("extracted_findings.id", ondelete="SET NULL"), nullable=True)
    document_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    reviewer_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    action_type: Mapped[str] = mapped_column(String(50), nullable=False) # verify, correct, flag, resolve_conflict
    previous_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    correction_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    finding = relationship("ExtractedFinding", back_populates="reviews")
    reviewer = relationship("User", back_populates="reviews_conducted")

class ChatHistory(Base):
    __tablename__ = "chat_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    cited_evidence: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    patient = relationship("Patient", back_populates="chat_history")
    user = relationship("User", back_populates="chat_queries")

class AIConversation(Base, TimestampMixin):
    __tablename__ = "ai_conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # "patient", "doctor", "administrator"
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="New Consultation")
    patient_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=True, index=True)

    # Relationships
    user = relationship("User")
    patient = relationship("Patient")
    messages = relationship("AIMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="AIMessage.created_at")

class AIMessage(Base, TimestampMixin):
    __tablename__ = "ai_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    conversation_id: Mapped[str] = mapped_column(String(36), ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender: Mapped[str] = mapped_column(String(20), nullable=False)  # "user" or "assistant"
    message_content: Mapped[str] = mapped_column(Text, nullable=False)
    citations: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON-encoded array
    recommendations: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON-encoded array
    questions_for_doctor: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON-encoded array
    disclaimer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    conversation = relationship("AIConversation", back_populates="messages")
