from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.social_media import social_media_service

router = APIRouter()

class UsernameRequest(BaseModel):
    username: str

@router.post("/search")
async def search_username(request: UsernameRequest):
    data = await social_media_service.search_all(request.username)

    profiles = data["profiles"]
    evidence = data["evidence"]

    return {
        "username": request.username,
        "profiles": profiles,
        "evidence": evidence,
    }
