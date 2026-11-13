from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class PatientBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: str = Field(..., description="YYYY-MM-DD")
    gender: str = Field("unknown", description="male, female, other, unknown")
    blood_group: str = Field("unknown", description="A+, A-, B+, B-, AB+, AB-, O+, O-, unknown")
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    medical_notes: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    medical_notes: Optional[str] = None

class PatientAccessOut(BaseModel):
    id: str
    user_id: str
    patient_id: str
    access_level: str
    user_email: Optional[str] = None
    user_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class PatientAccessCreate(BaseModel):
    user_email: str
    access_level: str = Field("viewer", pattern="^(owner|doctor|viewer)$")

class PatientOut(PatientBase):
    id: str
    created_by_id: str
    created_at: datetime
    updated_at: datetime
    access_level: Optional[str] = None  # user's specific access level to this patient
    documents_count: Optional[int] = 0
    findings_count: Optional[int] = 0
    contradictions_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

class PatientDetailOut(PatientOut):
    access_list: List[PatientAccessOut] = []
