from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user
from app.services.profile_service import get_user_profile, save_user_profile, ensure_profile_table
from pydantic import BaseModel
from typing import Optional, Dict, Any

router = APIRouter(prefix="/user", tags=["user"])

# Ensure table exists
ensure_profile_table()

class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    address: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

@router.get("/profile")
async def fetch_profile(current_user: dict = Depends(get_current_user)):
    """Get the current user's personalized profile."""
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found")
    profile = get_user_profile(user_id)
    return {"profile": profile}

@router.post("/profile")
async def update_profile(body: ProfileUpdateRequest, current_user: dict = Depends(get_current_user)):
    """Update user profile details for automated drafting."""
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found")
    
    success = save_user_profile(user_id, body.dict(exclude_unset=True))
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update profile")
    
    return {"message": "Profile updated successfully", "profile": get_user_profile(user_id)}
