"""Authentication and user management API endpoints."""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, status, Query
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.models import User, UserRole, APIKey
from app.auth import verify_api_key
from app import config

router = APIRouter(tags=["Auth"])

auth_dep = [Depends(verify_api_key)] if config.API_KEY else []

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = config.JWT_SECRET
ALGORITHM = config.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = config.JWT_EXPIRE_MINUTES


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = UserRole.VIEWER


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8, max_length=128)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    last_login: Optional[str]
    created_at: str


class TokenRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class APIKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    expires_days: Optional[int] = Field(None, ge=1, le=3650)
    scopes: List[str] = Field(default_factory=list)
    rate_limit: Optional[str] = Field(None, pattern="^\\d+/(second|minute|hour|day)$")


class APIKeyResponse(BaseModel):
    key_id: str
    key: str  # Only returned on creation
    name: str
    user_id: int
    is_active: bool
    expires_at: Optional[str]
    scopes: List[str]
    rate_limit: Optional[str]
    created_at: str


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


async def get_current_user(token: str = Depends(verify_api_key)) -> User:
    """Get current user from JWT token (for future use)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    async for db in get_db():
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()
        if user is None:
            raise credentials_exception
        return user


@router.post("/login", response_model=TokenResponse)
async def login(request: TokenRequest):
    """Authenticate user and return JWT token."""
    async for db in get_db():
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.username == request.username))
        user = result.scalar_one_or_none()
        
        if not user or not verify_password(request.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")
        
        # Update last login
        user.last_login = datetime.now(timezone.utc)
        await db.commit()
        
        access_token = create_access_token(data={"sub": user.username, "role": user.role.value})
        return TokenResponse(
            access_token=access_token,
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(request: UserCreate):
    """Register a new user (admin only in production)."""
    async for db in get_db():
        from sqlalchemy import select
        # Check existing
        existing = await db.execute(select(User).where(
            (User.username == request.username) | (User.email == request.email)
        ))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Username or email already registered")
        
        user = User(
            username=request.username,
            email=request.email,
            password_hash=get_password_hash(request.password),
            role=request.role,
        )
        db.add(user)
        await db.flush()
        return user.to_dict()


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    _: None = Depends(verify_api_key) if config.API_KEY else None,
):
    """List all users."""
    async for db in get_db():
        from sqlalchemy import select
        result = await db.execute(select(User).offset(skip).limit(limit))
        users = result.scalars().all()
        return [u.to_dict() for u in users]


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    _: None = Depends(verify_api_key) if config.API_KEY else None,
):
    """Get a specific user."""
    async for db in get_db():
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user.to_dict()


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    request: UserUpdate,
    _: None = Depends(verify_api_key) if config.API_KEY else None,
):
    """Update a user."""
    async for db in get_db():
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if request.email is not None:
            user.email = request.email
        if request.password is not None:
            user.password_hash = get_password_hash(request.password)
        if request.role is not None:
            user.role = request.role
        if request.is_active is not None:
            user.is_active = request.is_active
        
        await db.commit()
        return user.to_dict()


@router.delete("/users/{user_id}", dependencies=auth_dep)
async def delete_user(user_id: int):
    """Delete a user."""
    async for db in get_db():
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        await db.delete(user)
        return {"message": "User deleted", "user_id": user_id}


@router.post("/api-keys", response_model=APIKeyResponse, status_code=status.HTTP_201_CREATED, dependencies=auth_dep)
async def create_api_key(request: APIKeyCreate):
    """Create a new API key for the current user."""
    async for db in get_db():
        # For now, use a default user (in production, get from auth)
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.role == UserRole.ADMIN))
        admin_user = result.scalar_one_or_none()
        if not admin_user:
            # Create a default admin if none exists
            admin_user = User(
                username="admin",
                email="admin@localhost",
                password_hash=get_password_hash("changeme"),
                role=UserRole.ADMIN,
            )
            db.add(admin_user)
            await db.flush()
        
        key_id, key, key_hash = APIKey.generate_key()
        
        expires_at = None
        if request.expires_days:
            expires_at = datetime.now(timezone.utc) + timedelta(days=request.expires_days)
        
        api_key = APIKey(
            key_id=key_id,
            key_hash=key_hash,
            name=request.name,
            user_id=admin_user.id,
            expires_at=expires_at,
            scopes=request.scopes,
            rate_limit=request.rate_limit,
        )
        db.add(api_key)
        await db.flush()
        
        response = api_key.to_dict()
        response["key"] = key  # Only returned once!
        return response


@router.get("/api-keys", response_model=List[APIKeyResponse], dependencies=auth_dep)
async def list_api_keys(
    user_id: Optional[int] = None,
    _: None = Depends(verify_api_key) if config.API_KEY else None,
):
    """List API keys."""
    async for db in get_db():
        from sqlalchemy import select
        query = select(APIKey)
        if user_id:
            query = query.where(APIKey.user_id == user_id)
        result = await db.execute(query)
        keys = result.scalars().all()
        return [k.to_dict() for k in keys]


@router.delete("/api-keys/{key_id}", dependencies=auth_dep)
async def revoke_api_key(key_id: str):
    """Revoke an API key."""
    async for db in get_db():
        from sqlalchemy import select
        result = await db.execute(select(APIKey).where(APIKey.key_id == key_id))
        api_key = result.scalar_one_or_none()
        if not api_key:
            raise HTTPException(status_code=404, detail="API key not found")
        api_key.is_active = False
        await db.commit()
        return {"message": "API key revoked", "key_id": key_id}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user info (requires JWT)."""
    return current_user.to_dict()