"""
Pydantic Schemas for Universal Medical Normalization Engine
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class UnitConversionRequest(BaseModel):
    value: float = Field(..., description="Numeric clinical measurement value")
    from_unit: str = Field(..., description="Original unit (e.g. mg/dL, kg, °C, g/dL)")
    to_unit: Optional[str] = Field(None, description="Target unit (e.g. mmol/L, lb, °F)")
    analyte: Optional[str] = Field(None, description="Biochemical analyte key (e.g. glucose, cholesterol, creatinine)")
    destination_country: Optional[str] = Field(None, description="ISO-2 country code (e.g. US, GB, IN, DE)")

class UnitConversionResponse(BaseModel):
    original_value: float
    original_unit: str
    normalized_value: float
    normalized_unit: str
    formula: str
    analyte: str
    converted: bool

class ContextDetectionRequest(BaseModel):
    text: str = Field(..., description="Clinical note or OCR extracted text")
    file_name: Optional[str] = Field("", description="File name if applicable")

class ContextDetectionResponse(BaseModel):
    detected_language: str
    language_name: str
    detected_country: str
    country_name: str
    confidence: float

class DateNormalizationRequest(BaseModel):
    date_str: str = Field(..., description="Raw date string from document (e.g. 14/07/1956 or 07/14/1956)")
    country_context: Optional[str] = Field("IN", description="Origin country code to guide disambiguation")

class DateNormalizationResponse(BaseModel):
    original_date_str: str
    normalized_iso_date: str
    country_context: str
    disambiguation_rationale: str

class TermNormalizationRequest(BaseModel):
    raw_term: str = Field(..., description="Vernacular or multilingual clinical term (e.g. 'शुगर', 'Blutzucker', 'Sugar')")

class TermNormalizationResponse(BaseModel):
    original_term: str
    concept_key: str
    canonical_name: str
    category: str
    loinc: Optional[str] = None
    snomed_ct: Optional[str] = None
    icd_10: Optional[str] = None
    rxnorm_cui: Optional[str] = None
    atc_code: Optional[str] = None
    standardized: bool

class TravelSummaryResponse(BaseModel):
    patient: Dict[str, Any]
    origin_country: Dict[str, Any]
    destination_country: Dict[str, Any]
    travel_mode_active: bool
    medications: List[Dict[str, Any]]
    investigations: List[Dict[str, Any]]
    allergies: List[Dict[str, Any]]
    emergency_info: Dict[str, Any]
    generated_at: str

class EmergencyPassportResponse(BaseModel):
    passport_id: str
    patient_id: str
    destination_country: Dict[str, Any]
    payload: Dict[str, Any]
    qr_payload_raw: str
    qr_data_uri: str
    base64_offline_token: str
    offline_instructions: str
