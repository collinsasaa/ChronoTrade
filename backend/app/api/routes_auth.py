"""
API Routes for User Sign Up, Sign In, and Current User Info.
SQLite Database Persistence with client-IP rate limiting.
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
import uuid
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.db.database import get_db, UserRecord, backup_user
from app.engine.auth import hash_password, verify_password, create_access_token, decode_access_token

def get_client_ip(request: Request) -> str:
    """Extract real client IP behind reverse proxy headers (e.g. Render / Cloudflare)."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)

limiter = Limiter(key_func=get_client_ip)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class SignUpPayload(BaseModel):
    full_name: str
    email: str
    password: str

class SignInPayload(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

@router.post("/signup", response_model=AuthResponse)
def sign_up(payload: SignUpPayload, db: Session = Depends(get_db)):
    """Create a new user account."""
    email_clean = payload.email.strip().lower()
    
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")
        
    hashed_pwd = hash_password(payload.password)
    user_id = f"usr_{uuid.uuid4().hex[:12]}"

    existing = db.query(UserRecord).filter(UserRecord.email == email_clean).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email address already exists. Please sign in.")
        
    user_obj = UserRecord(
        id=user_id,
        email=email_clean,
        full_name=payload.full_name.strip(),
        hashed_password=hashed_pwd
    )
    db.add(user_obj)
    db.commit()
    db.refresh(user_obj)
    
    # Save user account to persistent backup file
    backup_user(user_obj)
    
    user_dict = {
        "id": user_obj.id,
        "email": user_obj.email,
        "full_name": user_obj.full_name,
        "created_at": user_obj.created_at.isoformat()
    }
    
    token = create_access_token({"sub": user_id, "email": email_clean})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_dict
    }

@router.post("/signin", response_model=AuthResponse)
@limiter.limit("15/minute")
def sign_in(request: Request, payload: SignInPayload, db: Session = Depends(get_db)):
    """Authenticate credentials and return JWT access token."""
    email_clean = payload.email.strip().lower()
    
    user = db.query(UserRecord).filter(UserRecord.email == email_clean).first()
    if not user:
        raise HTTPException(status_code=401, detail="Account not found. If the server restarted, please register your account again.")
        
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid password. Please check your password and try again.")
        
    user_id = user.id
    user_info = {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "created_at": user.created_at.isoformat()
    }
        
    token = create_access_token({"sub": user_id, "email": email_clean})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_info
    }

@router.get("/me")
def get_me(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Retrieve profile details for current authenticated user."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token.")
        
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Expired or invalid token.")
        
    user_id = payload["sub"]
    
    user = db.query(UserRecord).filter(UserRecord.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found or server database restarted.")
        
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "created_at": user.created_at.isoformat()
    }
