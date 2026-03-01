from fastapi import APIRouter, Depends, HTTPException, Path
from fastapi.responses import StreamingResponse
from app.core.auth import get_current_user
from app.services.chat_service import (
    create_session, add_message, get_session,
    list_sessions, delete_session, update_session_title
)
from app.services.rag_pipeline import rag_pipeline
from pydantic import BaseModel
from typing import Optional
import json

router = APIRouter(prefix="/chat", tags=["chat"])

# ─── Pydantic Models ───

class NewSessionRequest(BaseModel):
    title: Optional[str] = "New Chat"

class MessageRequest(BaseModel):
    session_id: str
    message: str

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

    user_msg = add_message(user_id, body.session_id, role="user", content=body.message)

    try:
        ai_response = rag_pipeline.analyze_document(body.message, stream=False)
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

    def event_generator():
        collected = []
        try:
            for chunk in rag_pipeline.analyze_document(body.message, stream=True):
                collected.append(chunk)
                yield f"data: {json.dumps({'content': chunk})}\n\n"
        except Exception as e:
            error_msg = f"Error: {str(e)}"
            collected.append(error_msg)
            yield f"data: {json.dumps({'content': error_msg, 'error': True})}\n\n"
        
        # Store full bot response after stream ends
        full_text = "".join(collected)
        add_message(user_id, body.session_id, role="assistant", content=full_text)
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
