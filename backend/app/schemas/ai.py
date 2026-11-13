from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class ChatQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=4000)
    conversation_id: Optional[str] = None
    patient_id: Optional[str] = None

class CitationItem(BaseModel):
    document_name: str
    page: Optional[int] = None
    text_span: Optional[str] = None

class ChatQueryResponse(BaseModel):
    conversation_id: str
    message_id: str
    query: str
    content: str
    role: str
    citations: List[Dict[str, Any]] = []
    recommendations: List[str] = []
    questions_for_doctor: List[str] = []
    disclaimer: Optional[str] = None
    timestamp: str

class MessageOut(BaseModel):
    id: str
    conversation_id: str
    sender: str  # "user" or "assistant"
    message_content: str
    citations: Optional[List[Dict[str, Any]]] = None
    recommendations: Optional[List[str]] = None
    questions_for_doctor: Optional[List[str]] = None
    disclaimer: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ConversationOut(BaseModel):
    id: str
    title: str
    role: str
    patient_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    last_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
