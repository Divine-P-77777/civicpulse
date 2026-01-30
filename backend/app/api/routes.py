"""
API routes configuration.
"""

from fastapi import APIRouter
from app.api.endpoints import auth, documents, chat, live

# Create main API router
api_router = APIRouter()

# Include endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(live.router, prefix="/live", tags=["live"])