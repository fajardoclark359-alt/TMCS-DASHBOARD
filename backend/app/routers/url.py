from fastapi import APIRouter
from pydantic import BaseModel
from app.services.url_investigation import url_investigation_service

router = APIRouter()

class URLRequest(BaseModel):
    url: str

@router.post("/investigate")
async def investigate_url(request: URLRequest):
    return await url_investigation_service.investigate_url(request.url)
