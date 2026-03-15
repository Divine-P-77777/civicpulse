from fastapi import APIRouter, Depends, HTTPException, Path, UploadFile, Form, BackgroundTasks, Header
from fastapi.responses import StreamingResponse
from app.core.auth import get_current_user
from app.services.chat_service import (
    create_session, add_message, get_session,
    list_sessions, delete_session, update_session_title,
    share_session, get_shared_session
)
from app.services.rag_pipeline import rag_pipeline
from pydantic import BaseModel
from typing import Optional
import json
import os

import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

# ─── Pydantic Models ───

class NewSessionRequest(BaseModel):
    title: Optional[str] = "New Chat"

class MessageRequest(BaseModel):
    session_id: str
    message: str
    language: Optional[str] = "en"  # "en" or "hi"

class UpdateTitleRequest(BaseModel):
    title: str

# ═══════════════════════════════════════════════
# SESSION MANAGEMENT
# ═══════════════════════════════════════════════

@router.post("/session")
async def create_chat_session(
    body: NewSessionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new chat session for the authenticated user."""
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    result = create_session(user_id, title=body.title)
    return {"user_id": user_id, **result}

@router.get("/sessions")
async def list_chat_sessions(current_user: dict = Depends(get_current_user)):
    """List all chat sessions for the authenticated user."""
    user_id = current_user.get("sub")
    sessions = list_sessions(user_id)
    return {"user_id": user_id, "sessions": sessions}

@router.get("/session/{session_id}")
async def get_chat_session(session_id: str = Path(...), current_user: dict = Depends(get_current_user)):
    """Get full chat history for a session."""
    user_id = current_user.get("sub")
    session = get_session(user_id, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"user_id": user_id, **session}

@router.put("/session/{session_id}/title")
async def rename_chat_session(session_id: str = Path(...), body: UpdateTitleRequest = ..., current_user: dict = Depends(get_current_user)):
    """Rename a chat session."""
    user_id = current_user.get("sub")
    return update_session_title(user_id, session_id, body.title)

@router.delete("/session/{session_id}")
async def delete_chat_session(session_id: str = Path(...), current_user: dict = Depends(get_current_user)):
    """Delete a chat session and all its messages."""
    user_id = current_user.get("sub")
    return delete_session(user_id, session_id)

# ═══════════════════════════════════════════════
# MESSAGING — Non-streaming
# ═══════════════════════════════════════════════

@router.post("/message")
async def send_message(body: MessageRequest, current_user: dict = Depends(get_current_user)):
    """Send a user message and get a full AI response."""
    user_id = current_user.get("sub")
    session = get_session(user_id, body.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get full chat history for context continuity
    chat_history = session.get("messages", [])

    user_msg = add_message(user_id, body.session_id, role="user", content=body.message)

    try:
        ai_response = rag_pipeline.analyze_document(
            query=body.message,
            user_id=user_id,
            session_id=body.session_id,
            chat_history=chat_history,
            language=body.language,
            stream=False,
            mode="chat"
        )
    except Exception as e:
        ai_response = f"I'm sorry, I encountered an error: {str(e)}"

    bot_msg = add_message(user_id, body.session_id, role="assistant", content=ai_response)
    return {"session_id": body.session_id, "user_message": user_msg, "bot_response": bot_msg}

# ═══════════════════════════════════════════════
# MESSAGING — Streaming (SSE)
# ═══════════════════════════════════════════════

@router.post("/stream")
async def stream_message(body: MessageRequest, current_user: dict = Depends(get_current_user)):
    """
    Send a user message and stream the AI response as Server-Sent Events.
    After streaming completes, the full response is stored in the chat history.
    """
    user_id = current_user.get("sub")
    session = get_session(user_id, body.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Store user message immediately
    add_message(user_id, body.session_id, role="user", content=body.message)
    chat_history = session.get("messages", [])

    # Auto-generate title if this is the first message in the session
    is_first_message = session.get("title", "New Chat") == "New Chat" and len(chat_history) == 0

    def event_generator():
        collected = []
        try:
            for chunk in rag_pipeline.analyze_document(
                query=body.message,
                user_id=user_id,
                session_id=body.session_id,
                chat_history=chat_history,
                language=body.language,
                stream=True,
                mode="chat"
            ):
                collected.append(chunk)
                yield f"data: {json.dumps({'content': chunk})}\n\n"
        except Exception as e:
            error_msg = f"Error: {str(e)}"
            collected.append(error_msg)
            yield f"data: {json.dumps({'content': error_msg, 'error': True})}\n\n"
        
        # Store full bot response after stream ends
        full_text = "".join(collected)
        add_message(user_id, body.session_id, role="assistant", content=full_text)

        # Auto-generate title from first user message
        if is_first_message:
            try:
                # Use a simplified prompt for title generation
                title_prompt = f"Generate a short, descriptive chat title (max 5 words) for this legal query: \"{body.message[:100]}\". No quotes, no intro text, just the title."
                
                # Attempt to use the same analysis pipeline for title generation (non-streaming)
                # This ensures we use the same credentials/model configured for the app
                auto_title = rag_pipeline.get_simple_completion(title_prompt)
                
                if not auto_title or len(auto_title) > 60:
                    auto_title = body.message[:40].strip() + "..."
                
                update_session_title(user_id, body.session_id, auto_title)
            except Exception as e:
                logger.warning(f"Auto-title generation failed: {e}")
                # Fallback to message snippet
                fallback_title = body.message[:40].strip()
                if len(body.message) > 40: fallback_title += "..."
                update_session_title(user_id, body.session_id, fallback_title)

        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# ═══════════════════════════════════════════════
# SHARE CHAT
# ═══════════════════════════════════════════════

@router.post("/session/{session_id}/share")
async def share_chat(session_id: str = Path(...), current_user: dict = Depends(get_current_user)):
    """Generate a share link for a chat session."""
    user_id = current_user.get("sub")
    session = get_session(user_id, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    share_id = share_session(user_id, session_id)
    return {"share_id": share_id}

@router.get("/shared/{share_id}")
async def view_shared_chat(share_id: str = Path(...)):
    """Public endpoint — view a shared chat (no auth required)."""
    session = get_shared_session(share_id)
    if not session:
        raise HTTPException(status_code=404, detail="Shared chat not found")
    return session

# ═══════════════════════════════════════════════
# DOCUMENT UPLOAD (User-facing ingestion)
# ═══════════════════════════════════════════════

from app.services.s3_service import upload_to_s3, S3_BUCKET
from app.services.ingestion_service import run_document_ingestion

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = ...,
    metadata: str = Form('{"type": "user_upload"}'),
    current_user: dict = Depends(get_current_user),
    x_live_session_id: Optional[str] = Header(None)
):
    """
    User-facing document upload.
    Uploads the file to S3, then kicks off the ingestion pipeline
    (Textract → chunk → embed → OpenSearch) as a background task
    so the user isn't blocked waiting for large documents.
    """
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found")

    # Validate file type
    allowed_types = [
        "application/pdf",
        "image/jpeg", "image/png", "image/jpg", "image/webp"
    ]
    if file.content_type and file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}. Use PDF or image.")

    try:
        meta_dict = json.loads(metadata)
    except json.JSONDecodeError:
        meta_dict = {"type": "user_upload"}
    
    meta_dict["uploaded_by"] = user_id
    meta_dict["source_type"] = "private"
    meta_dict["source_filename"] = file.filename

    # Upload to S3
    file_key = upload_to_s3(file)

    # Start ingestion in the background — user gets immediate response
    background_tasks.add_task(run_document_ingestion, S3_BUCKET, file_key, meta_dict, user_id, x_live_session_id)

    return {
        "message": f"File '{file.filename}' uploaded successfully. Ingestion is processing in the background.",
        "file_key": file_key,
        "status": "processing"
    }
