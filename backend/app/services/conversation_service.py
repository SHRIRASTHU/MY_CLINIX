"""Conversation and message persistence service for MY CLINIX AI Chatbots.
Stores and manages conversation history in Supabase PostgreSQL
with strict user isolation and cascading cleanup.
"""

import json
import logging
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.records import AIConversation, AIMessage
from app.schemas.ai import ConversationOut, MessageOut

logger = logging.getLogger("myclinix.ai.conversation")

def get_or_create_conversation(
    db: Session,
    user_id: str,
    role: str,
    conversation_id: Optional[str] = None,
    patient_id: Optional[str] = None,
    initial_title: Optional[str] = None
) -> AIConversation:
    """Retrieve existing conversation belonging to user or initialize a new one."""
    if conversation_id:
        conv = (
            db.query(AIConversation)
            .filter(AIConversation.id == conversation_id, AIConversation.user_id == user_id)
            .first()
        )
        if conv:
            if patient_id and not conv.patient_id:
                conv.patient_id = patient_id
                db.commit()
            return conv

    # Create new conversation
    title = initial_title or ("Clinical Consultation" if role == "doctor" else ("Platform Operations" if role == "administrator" else "Personal Health Assistant"))
    new_conv = AIConversation(
        user_id=user_id,
        role=role,
        title=title[:255],
        patient_id=patient_id,
    )
    db.add(new_conv)
    db.commit()
    db.refresh(new_conv)
    return new_conv

def list_user_conversations(
    db: Session,
    user_id: str,
    role: Optional[str] = None
) -> List[ConversationOut]:
    """List all active conversation sessions for authenticated user."""
    query = db.query(AIConversation).filter(AIConversation.user_id == user_id)
    if role:
        query = query.filter(AIConversation.role == role)
    
    convs = query.order_by(AIConversation.updated_at.desc()).all()
    results = []
    for c in convs:
        last_msg = (
            db.query(AIMessage)
            .filter(AIMessage.conversation_id == c.id)
            .order_by(AIMessage.created_at.desc())
            .first()
        )
        msg_count = db.query(AIMessage).filter(AIMessage.conversation_id == c.id).count()
        results.append(
            ConversationOut(
                id=c.id,
                title=c.title,
                role=c.role,
                patient_id=c.patient_id,
                created_at=c.created_at,
                updated_at=c.updated_at,
                message_count=msg_count,
                last_message=last_msg.message_content[:80] if last_msg else None,
            )
        )
    return results

def get_conversation_messages(
    db: Session,
    user_id: str,
    conversation_id: str,
    limit: int = 50
) -> List[MessageOut]:
    """Retrieve chronologically ordered message history for a user's conversation."""
    conv = (
        db.query(AIConversation)
        .filter(AIConversation.id == conversation_id, AIConversation.user_id == user_id)
        .first()
    )
    if not conv:
        return []

    messages = (
        db.query(AIMessage)
        .filter(AIMessage.conversation_id == conv.id)
        .order_by(AIMessage.created_at.asc())
        .limit(limit)
        .all()
    )

    out = []
    for m in messages:
        citations_parsed = json.loads(m.citations) if m.citations else None
        recommendations_parsed = json.loads(m.recommendations) if m.recommendations else None
        questions_parsed = json.loads(m.questions_for_doctor) if m.questions_for_doctor else None
        out.append(
            MessageOut(
                id=m.id,
                conversation_id=m.conversation_id,
                sender=m.sender,
                message_content=m.message_content,
                citations=citations_parsed,
                recommendations=recommendations_parsed,
                questions_for_doctor=questions_parsed,
                disclaimer=m.disclaimer,
                created_at=m.created_at,
            )
        )
    return out

def record_chat_message(
    db: Session,
    conversation_id: str,
    sender: str,
    content: str,
    citations: Optional[List[Dict[str, Any]]] = None,
    recommendations: Optional[List[str]] = None,
    questions_for_doctor: Optional[List[str]] = None,
    disclaimer: Optional[str] = None
) -> AIMessage:
    """Persist a message in the conversation and update the conversation timestamp."""
    msg = AIMessage(
        conversation_id=conversation_id,
        sender=sender,
        message_content=content,
        citations=json.dumps(citations) if citations else None,
        recommendations=json.dumps(recommendations) if recommendations else None,
        questions_for_doctor=json.dumps(questions_for_doctor) if questions_for_doctor else None,
        disclaimer=disclaimer,
    )
    db.add(msg)

    # Touch conversation updated_at
    conv = db.query(AIConversation).filter(AIConversation.id == conversation_id).first()
    if conv:
        conv.updated_at = datetime.now(timezone.utc)
        # Update title from first user query if still default
        if sender == "user" and (conv.title in ["New Consultation", "Clinical Consultation", "Platform Operations", "Personal Health Assistant"]):
            clean_title = content.strip().split("\n")[0][:45]
            if clean_title:
                conv.title = clean_title

    db.commit()
    db.refresh(msg)
    return msg

def delete_user_conversation(db: Session, user_id: str, conversation_id: str) -> bool:
    """Delete a specific conversation and all associated messages."""
    conv = (
        db.query(AIConversation)
        .filter(AIConversation.id == conversation_id, AIConversation.user_id == user_id)
        .first()
    )
    if not conv:
        return False
    db.delete(conv)
    db.commit()
    return True

def clear_all_user_conversations(db: Session, user_id: str, role: Optional[str] = None) -> int:
    """Clear all conversation history for the authenticated user."""
    query = db.query(AIConversation).filter(AIConversation.user_id == user_id)
    if role:
        query = query.filter(AIConversation.role == role)
    convs = query.all()
    count = len(convs)
    for c in convs:
        db.delete(c)
    db.commit()
    return count
