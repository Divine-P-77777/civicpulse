"""
Authentication endpoints.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """User login endpoint."""
    # TODO: Implement Supabase authentication
    return {
        "access_token": "mock_token",
        "token_type": "bearer",
        "user": {"email": request.email, "id": "mock_id"}
    }


@router.post("/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    """User registration endpoint."""
    # TODO: Implement Supabase user registration
    return {
        "access_token": "mock_token",
        "token_type": "bearer",
        "user": {"email": request.email, "id": "mock_id"}
    }


@router.post("/logout")
async def logout():
    """User logout endpoint."""
    # TODO: Implement session invalidation
    return {"message": "Logged out successfully"}