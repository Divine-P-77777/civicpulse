from fastapi import APIRouter, Depends, HTTPException, Path
from fastapi.responses import StreamingResponse
from app.core.auth import get_current_user
from app.services.chat_service import (
    create_session, add_message, get_session, update_session_title
)
from app.services.rag_pipeline import rag_pipeline
from app.services.draft_service import save_draft, list_drafts, delete_draft, ensure_draft_table
from pydantic import BaseModel
from typing import Optional
import json
import logging

logger = logging.getLogger(__name__)

# Ensure schema exists on startup
ensure_draft_table()

router = APIRouter(prefix="/drafts", tags=["drafts"])

# ─── Pydantic Models ───

class DraftSessionRequest(BaseModel):
    title: Optional[str] = "New Legal Draft"

class DraftRequest(BaseModel):
    session_id: str
    message: str
    language: Optional[str] = "en"
    topic: Optional[str] = "Legal Document"
    draft_type: Optional[str] = "complaint"
    type_label: Optional[str] = None

# ═══════════════════════════════════════════════
# DRAFT SESSION MANAGEMENT
# ═══════════════════════════════════════════════

@router.post("/session")
async def create_draft_session(
    body: DraftSessionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new session specifically for drafting."""
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    result = create_session(user_id, title=body.title)
    return {"user_id": user_id, **result}

# ═══════════════════════════════════════════════
# DRAFT GENERATION — Streaming
# ═══════════════════════════════════════════════

@router.post("/stream")
async def stream_draft(body: DraftRequest, current_user: dict = Depends(get_current_user)):
    """
    Stream a legal draft generation.
    Uses the specialized 'draft' mode in RagPipeline.
    """
    user_id = current_user.get("sub")
    session = get_session(user_id, body.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Store user request
    add_message(user_id, body.session_id, role="user", content=body.message)
    chat_history = session.get("messages", [])

    logger.info(f"[Draft Stream] Starting generation for Session: {body.session_id}")
    logger.info(f"[Draft Stream] Prompt Size: {len(body.message)} chars | Context Size: {len(chat_history)} messages")

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
                mode="draft"  # Specialized Drafting Mode
            ):
                collected.append(chunk)
                # Uncomment the line below to log every chunk (noisy!)
                # logger.debug(f"[Draft Stream Chunk]: {chunk}")
                yield f"data: {json.dumps({'content': chunk})}\n\n"
        except Exception as e:
            logger.error(f"[Draft Stream API Error] Session {body.session_id}: {str(e)}")
            error_msg = f"Error: {str(e)}"
            collected.append(error_msg)
            yield f"data: {json.dumps({'content': error_msg, 'error': True})}\n\n"
        
        # Store full result
        full_text = "".join(collected)
        logger.info(f"[Draft Stream] Generation complete for Session {body.session_id}. Total chunks: {len(collected)}")
        add_message(user_id, body.session_id, role="assistant", content=full_text)
        
        # PERSIST TO NEW DRAFT HISTORY SCHEMA
        save_draft(
            user_id=user_id,
            topic=body.topic,
            draft_type=body.draft_type,
            content=full_text,
            type_label=body.type_label
        )
        
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# ═══════════════════════════════════════════════
# DRAFT HISTORY
# ═══════════════════════════════════════════════

@router.get("/history")
async def get_draft_history(current_user: dict = Depends(get_current_user)):
    """Fetch all past drafts for the user."""
    user_id = current_user.get("sub")
    drafts = list_drafts(user_id)
    return {"drafts": drafts}

@router.delete("/{draft_id}")
async def remove_draft(draft_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a draft from history."""
    user_id = current_user.get("sub")
    success = delete_draft(user_id, draft_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete draft")
    return {"deleted": True, "draft_id": draft_id}
