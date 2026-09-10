from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import username, email, phone, domain, url

app = FastAPI(
    title="OSINT TMC/CLARK",
    description="Cyber Intelligence Platform - Open Source Intelligence gathering tool for security research",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(username.router, prefix="/api/username", tags=["Username"])
app.include_router(email.router, prefix="/api/email", tags=["Email"])
app.include_router(phone.router, prefix="/api/phone", tags=["Phone"])
app.include_router(domain.router, prefix="/api/domain", tags=["Domain"])
app.include_router(url.router, prefix="/api/url", tags=["URL"])

@app.get("/")
def root():
    return {"message": "OSINT TMC/CLARK - Cyber Intelligence Platform", "version": "2.0.0"}

@app.get("/health")
def health():
    return {"status": "healthy"}
