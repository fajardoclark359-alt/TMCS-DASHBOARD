from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.services.breach_check import breach_service
from app.services.phone_lookup import phone_service

router = APIRouter()

class EmailRequest(BaseModel):
    email: str
    api_key: Optional[str] = None

@router.post("/search")
async def search_email(request: EmailRequest):
    validation = phone_service.validate_email(request.email)

    breaches = await breach_service.check_email_breaches(request.email, request.api_key)

    return {
        "email": request.email,
        "validation": validation,
        "breaches": breaches,
    }

@router.post("/validate")
async def validate_email(email: str):
    return phone_service.validate_email(email)
