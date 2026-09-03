"""
ChronoTrade Authentication & JWT Security Module.
Uses native bcrypt with per-password random salts and environment-managed JWT secrets.
"""

import os
import datetime
from typing import Optional, Dict, Any
import jwt
import bcrypt

# Secret Key environment configuration
SECRET_KEY = os.environ.get("SECRET_KEY") or os.environ.get("JWT_SECRET_KEY")
ENV = os.environ.get("ENVIRONMENT", os.environ.get("ENV", "development")).lower()

if not SECRET_KEY:
    if ENV == "production":
        raise RuntimeError("FATAL: SECRET_KEY environment variable is missing in production!")
    # Development fallback secret key
    SECRET_KEY = "chronotrade_dev_secret_key_change_in_production_89f2a7e"

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

def _prepare_password(password: str) -> bytes:
    """Truncates password bytes to 72 bytes per bcrypt specification."""
    return password.encode("utf-8")[:72]

def hash_password(password: str) -> str:
    """Hashes password using bcrypt with a unique salt per password."""
    pwd_bytes = _prepare_password(password)
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies plain password against hashed password.
    Supports bcrypt hashes and returns False for unmigrated legacy static hashes.
    """
    if not hashed_password:
        return False
    try:
        if hashed_password.startswith(("$2a$", "$2b$", "$2y$")):
            pwd_bytes = _prepare_password(plain_password)
            return bcrypt.checkpw(pwd_bytes, hashed_password.encode("utf-8"))
        return False
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    """Generates JWT access token with expiration."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.now(datetime.timezone.utc) + expires_delta
    else:
        expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None
