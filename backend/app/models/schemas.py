
from pydantic import BaseModel


class UsernameRequest(BaseModel):
    username: str

class SocialProfile(BaseModel):
    platform: str
    url: str | None = None
    bio: str | None = None
    followers: int | None = None
    following: int | None = None
    created_at: str | None = None
    verified: bool | None = None
    profile_image: str | None = None

class UsernameResponse(BaseModel):
    username: str
    profiles: list[SocialProfile] = []
    email_candidates: list[str] = []
    full_name: str | None = None
