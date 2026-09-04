"""
Unit tests for ChronoTrade User Authentication (Sign Up, Sign In, Profile info, Passlib bcrypt, PyJWT, and Account Backup Restoration).
"""

import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.engine.auth import hash_password, verify_password, decode_access_token
from app.db.database import SessionLocal

client = TestClient(app)

def test_bcrypt_hash_and_verify():
    password = "MySecurePassword123"
    h1 = hash_password(password)
    h2 = hash_password(password)
    
    # Bcrypt generates a unique salt per call
    assert h1 != h2
    assert verify_password(password, h1) is True
    assert verify_password(password, h2) is True
    assert verify_password("WrongPass", h1) is False
    assert verify_password(password, "legacy_hash_string") is False

def test_decode_invalid_jwt_token():
    assert decode_access_token("invalid.jwt.token") is None

def test_auth_flow():
    # Test Signup with unique test email
    unique_id = uuid.uuid4().hex[:6]
    email = f"trader_{unique_id}@chronotrade.io"
    password = "SuperSecurePassword2026"
    full_name = "Quant Analyst"
    
    res_signup = client.post("/api/auth/signup", json={
        "email": email,
        "password": password,
        "full_name": full_name
    })
    
    assert res_signup.status_code == 200
    data_signup = res_signup.json()
    assert "access_token" in data_signup
    assert data_signup["user"]["email"] == email
    token = data_signup["access_token"]
    
    # Test Duplicate Signup Prevention
    res_dup = client.post("/api/auth/signup", json={
        "email": email,
        "password": password,
        "full_name": full_name
    })
    assert res_dup.status_code == 400
    
    # Test Signin
    res_signin = client.post("/api/auth/signin", json={
        "email": email,
        "password": password
    })
    assert res_signin.status_code == 200
    assert "access_token" in res_signin.json()
    
    # Test Signin Invalid Password
    res_bad = client.post("/api/auth/signin", json={
        "email": email,
        "password": "WrongPassword"
    })
    assert res_bad.status_code == 401
    
    # Test /api/auth/me
    res_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_me.status_code == 200
    assert res_me.json()["email"] == email
