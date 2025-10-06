"""Document-specific chat endpoints with multi-turn memory.

POST /documents/{doc_id}/chat
Body: { message: str, conversation_id?: str }
Returns: { response, conversation_id, sources }
"""
from __future__ import annotations

import logging
import os
import uuid as uuid_lib
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.sql import text as sql_text
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import ChatOpenAI
from langchain_community.vectorstores.pgvector import PGVector
from socratic_ai import SocraticAI

from models import PdfUploads, Conversations, Messages, PdfChunks
from wallet_auth import get_current_user
from .main import get_db  # reuse dependency and DB URL

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents-chat"])

DATABASE_URL = os.getenv("DATABASE_URL")


class DocChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    top_k: int = 3


class DocChatResponse(BaseModel):
    response: str
    conversation_id: str
    sources: List[str] = []
    follow_up_questions: List[str] = []


socratic_ai = SocraticAI()


@router.post("/{doc_id}/chat", response_model=DocChatResponse)
async def chat_over_document(
    doc_id: str,
    request: DocChatRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Contextual Q&A over a single uploaded document with multi-turn memory."""
    # Validate document
    try:
        doc_uuid = uuid_lib.UUID(doc_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    upload: PdfUploads | None = (
        db.query(PdfUploads).filter(PdfUploads.id == doc_uuid).first()
    )
    if not upload or upload.status != "COMPLETED":
        raise HTTPException(status_code=404, detail="Document not found or not ready")

    # Conversation row
    conv: Conversations | None = None
    if request.conversation_id:
        try:
            conv_uuid = uuid_lib.UUID(request.conversation_id)
            conv = db.query(Conversations).filter(Conversations.id == conv_uuid).first()
        except ValueError:
            conv = None
    if conv is None:
        conv = Conversations(id=uuid_lib.uuid4(), user_id=current_user.get("id"), doc_id=doc_uuid)
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # Retrieve last N messages for memory
    memory_messages: List[Messages] = (
        db.query(Messages)
        .filter(Messages.conversation_id == conv.id)
        .order_by(Messages.created_at.desc())
        .limit(6)
        .all()
    )
    memory_messages = list(reversed(memory_messages))  # oldest first

    memory_text = "\n".join([
        f"{m.role.capitalize()}: {m.content}" for m in memory_messages
    ])

    # Vector search limited to this document
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    vectorstore = PGVector(
        connection_string=DATABASE_URL,
        embedding_function=embeddings,
        collection_name="pdf_chunks",
    )
    # PGVector's similarity_search with filter unsupported; fetch then filter
    docs = vectorstore.similarity_search(request.message, k=10)
    relevant = [d for d in docs if d.metadata.get("upload_id") == str(doc_uuid)]
    relevant = relevant[: request.top_k]

    context = ""
    sources: List[str] = []
    if relevant:
        context_lines = []
        for i, d in enumerate(relevant, 1):
            context_lines.append(f"{i}. {d.page_content[:500]}...")
            sources.append(f"page {d.metadata.get('page', '?')}")
        context = "\n".join(context_lines)

    # Compose prompt
    prompt = (
        "You are an AI study assistant helping the user understand a PDF they provided."
        " If prior conversation history provides useful context, incorporate it."
        "\n\nConversation so far:\n" + (memory_text or "(no prior messages)") +
        "\n\nUser question: " + request.message +
        ("\n\nRelevant excerpts from the document:\n" + context if context else "") +
        "\n\nAnswer clearly and reference the document when helpful."
    )

    llm = ChatOpenAI(
        model="gpt-3.5-turbo",
        temperature=0.7,
        api_key=os.getenv("OPENAI_API_KEY"),
    )
    try:
        answer = await llm.ainvoke(prompt)
        resp_text = answer.content.strip()

        # Socratic follow-up generation
        socratic_response = await socratic_ai.generate_socratic_response(
            message_content=request.message,
            context={"room_name": "Document Chat", "sender_name": current_user.get("username")}
        )
        follow_qs = socratic_response.get("questions", [])
    except Exception as exc:
        logger.error("LLM error: %s", exc)
        raise HTTPException(status_code=500, detail="LLM error")

    # Store messages
    user_msg = Messages(
        id=uuid_lib.uuid4(),
        conversation_id=conv.id,
        role="user",
        content=request.message,
        sources=None,
    )
    assistant_msg = Messages(
        id=uuid_lib.uuid4(),
        conversation_id=conv.id,
        role="assistant",
        content=resp_text,
        sources={"chunks": sources},
    )

    # optionally store Socratic follow-ups
    follow_msgs: List[Messages] = []
    for q in follow_qs:
        follow_msgs.append(
            Messages(
                id=uuid_lib.uuid4(),
                conversation_id=conv.id,
                role="assistant",
                content=q,
                sources=None,
            )
        )

    db.add_all([user_msg, assistant_msg, *follow_msgs])
    db.commit()

    return DocChatResponse(
        response=resp_text,
        conversation_id=str(conv.id),
        sources=sources,
        follow_up_questions=follow_qs,
    )
