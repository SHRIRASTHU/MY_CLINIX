"""Centralized AI Chatbot Endpoints for MY CLINIX.
Supports Patient, Doctor, and Administrator roles with persistent conversations
and evidentiary grounding in Supabase PostgreSQL.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.ai import (
    ChatQueryRequest,
    ChatQueryResponse,
    ConversationOut,
    MessageOut,
)
from app.services.context_service import get_context_for_user_and_query
from app.services.conversation_service import (
    get_or_create_conversation,
    list_user_conversations,
    get_conversation_messages,
    record_chat_message,
    delete_user_conversation,
    clear_all_user_conversations,
)
from app.services.ai_service import generate_ai_response

logger = logging.getLogger("myclinix.api.ai")

router = APIRouter()

@router.post("/chat", response_model=ChatQueryResponse)
def chat_with_my_clinix(
    req: ChatQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Unified, role-aware OpenAI chatbot endpoint.
    Retrieves authorized clinical context from Supabase PostgreSQL,
    applies role-specific instructions, maintains conversation memory,
    and returns an evidence-grounded response.
    """
    user_role = (current_user.role or "patient").lower().strip()
    logger.info(f"AI chat request from {current_user.email} (Role: {user_role})")

    # 1. Retrieve authorized data context from Supabase PostgreSQL (strictly filtered by user query)
    try:
        context_text, citations, patient, intent = get_context_for_user_and_query(
            db=db,
            current_user=current_user,
            patient_id=req.patient_id,
            query=req.query,
        )
    except Exception as ctx_err:
        logger.error(f"Error retrieving context for user {current_user.id}: {ctx_err}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(ctx_err) or "Access denied to the requested clinical records."
        )

    patient_name = f"{patient.first_name} {patient.last_name}" if patient else None

    # 2. Get or initialize persistent conversation session
    conv = get_or_create_conversation(
        db=db,
        user_id=current_user.id,
        role=user_role,
        conversation_id=req.conversation_id,
        patient_id=patient.id if patient else req.patient_id,
        initial_title=req.query[:45]
    )

    # 3. Retrieve prior conversation turns for multi-turn conversational memory (prioritize latest turns)
    history_messages = get_conversation_messages(db=db, user_id=current_user.id, conversation_id=conv.id, limit=4)
    history_turns = [
        {"sender": m.sender, "content": m.message_content}
        for m in history_messages
    ]

    # 4. Record user query in persistent message store
    user_msg = record_chat_message(
        db=db,
        conversation_id=conv.id,
        sender="user",
        content=req.query,
    )

    # 5. Generate AI Response using OpenAI Service with role prompt, query intent & filtered context
    ai_result = generate_ai_response(
        query=req.query,
        role=user_role,
        context_text=context_text,
        citations=citations,
        conversation_history=history_turns,
        patient_name=patient_name,
        intent=intent,
    )

    # 6. Record assistant response in persistent message store
    assistant_msg = record_chat_message(
        db=db,
        conversation_id=conv.id,
        sender="assistant",
        content=ai_result["content"],
        citations=ai_result["citations"],
        recommendations=ai_result["recommendations"],
        questions_for_doctor=ai_result["questions_for_doctor"],
        disclaimer=ai_result["disclaimer"],
    )

    return ChatQueryResponse(
        conversation_id=conv.id,
        message_id=assistant_msg.id,
        query=req.query,
        content=ai_result["content"],
        role=user_role,
        citations=ai_result["citations"],
        recommendations=ai_result["recommendations"],
        questions_for_doctor=ai_result["questions_for_doctor"],
        disclaimer=ai_result["disclaimer"],
        timestamp=ai_result["timestamp"],
    )

@router.get("/conversations", response_model=List[ConversationOut])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all conversations belonging to the authenticated user."""
    return list_user_conversations(db=db, user_id=current_user.id, role=current_user.role)

@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageOut])
def get_messages_for_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve messages for an authorized conversation."""
    messages = get_conversation_messages(db=db, user_id=current_user.id, conversation_id=conversation_id)
    if not messages:
        # Check if conversation exists
        convs = list_user_conversations(db=db, user_id=current_user.id)
        if not any(c.id == conversation_id for c in convs):
            raise HTTPException(status_code=404, detail="Conversation session not found or access denied.")
    return messages

@router.post("/conversations/new", response_model=ConversationOut)
def start_new_conversation(
    title: Optional[str] = None,
    patient_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start a fresh conversation thread for the authenticated user."""
    conv = get_or_create_conversation(
        db=db,
        user_id=current_user.id,
        role=current_user.role,
        patient_id=patient_id,
        initial_title=title or "New Consultation",
    )
    return ConversationOut(
        id=conv.id,
        title=conv.title,
        role=conv.role,
        patient_id=conv.patient_id,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        message_count=0,
    )

@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a specific conversation session and its messages."""
    success = delete_user_conversation(db=db, user_id=current_user.id, conversation_id=conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found or unauthorized.")
    return {"status": "deleted", "conversation_id": conversation_id}

@router.delete("/conversations")
def clear_all_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clear all conversation history for the authenticated user."""
    deleted_count = clear_all_user_conversations(db=db, user_id=current_user.id, role=current_user.role)
    return {"status": "cleared", "deleted_count": deleted_count}
