"""
Chat mode endpoints.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()


class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: str


class ChatRequest(BaseModel):
    message: str
    document_id: Optional[str] = None
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    message: str
    conversation_id: str
    risk_assessment: Optional[dict] = None
    legal_references: Optional[List[dict]] = None


@router.post("/message", response_model=ChatResponse)
async def send_message(request: ChatRequest):
    """Send a chat message and get AI response."""
    # TODO: Implement AI chat processing
    return {
        "message": "This is a mock AI response to your legal question.",
        "conversation_id": "mock_conversation_id",
        "risk_assessment": {
            "level": "low",
            "explanation": "No significant risks detected."
        }
    }


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get conversation history."""
    # TODO: Implement conversation retrieval
    return {
        "id": conversation_id,
        "messages": []
    }


@router.get("/conversations")
async def list_conversations():
    """List user's conversations."""
    # TODO: Implement conversation listing
    return []