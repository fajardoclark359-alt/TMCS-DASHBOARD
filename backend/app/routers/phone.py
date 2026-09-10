from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.phone_lookup import phone_service

router = APIRouter()

class PhoneRequest(BaseModel):
    phone_number: str
    country_code: Optional[str] = "US"

@router.post("/lookup")
async def lookup_phone(request: PhoneRequest):
    return await phone_service.lookup_phone(request.phone_number, request.country_code)

@router.post("/validate")
async def validate_phone(phone_number: str, country_code: str = "US"):
    return await phone_service.lookup_phone(phone_number, country_code)
