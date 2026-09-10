from pydantic import BaseModel
from typing import Optional, List

class UsernameRequest(BaseModel):
    username: str

class SocialProfile(BaseModel):
    platform: str
    url: Optional[str] = None
    bio: Optional[str] = None
    followers: Optional[int] = None
    following: Optional[int] = None
    created_at: Optional[str] = None
    verified: Optional[bool] = None
    profile_image: Optional[str] = None

class UsernameResponse(BaseModel):
    username: str
    profiles: List[SocialProfile] = []
    email_candidates: List[str] = []
    full_name: Optional[str] = None
