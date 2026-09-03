"""
ChronoTrade Firestore Database Integration.
Supports native Google Cloud Firestore & Firebase Admin SDK
with seamless fallback to SQLite when unconfigured.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
import datetime
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()
backend_env = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
if os.path.exists(backend_env):
    load_dotenv(backend_env)

logger = logging.getLogger("chronotrade.firestore")

_db_client = None
_is_firestore_enabled = False

def init_firestore():
    """
    Initialize Firebase Admin SDK & Firestore Client.
    Checks for service account key file, project ID, or GCP environment credentials.
    """
    global _db_client, _is_firestore_enabled

    cred_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY") or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    project_id = os.environ.get("FIREBASE_PROJECT_ID") or os.environ.get("GCP_PROJECT")

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore

        if not firebase_admin._apps:
            if cred_path and os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred, {"projectId": project_id} if project_id else None)
                logger.info(f"Firestore initialized with Service Account Key: {cred_path}")
            elif os.environ.get("FIRESTORE_EMULATOR_HOST"):
                firebase_admin.initialize_app(options={"projectId": project_id or "chronotrade-demo"})
                logger.info("Firestore initialized using local emulator")
            elif project_id:
                try:
                    cred = credentials.ApplicationDefault()
                    firebase_admin.initialize_app(cred, {"projectId": project_id})
                    logger.info(f"Firestore initialized for Project ID: {project_id}")
                except Exception:
                    # Fallback to unauthenticated client for public firestore if allowed
                    firebase_admin.initialize_app(options={"projectId": project_id})
                    logger.info(f"Firestore initialized for Project ID: {project_id}")
            else:
                # Try default application credentials
                cred = credentials.ApplicationDefault()
                firebase_admin.initialize_app(cred)
                logger.info("Firestore initialized using Application Default Credentials")

        _db_client = firestore.client()
        _is_firestore_enabled = True
        logger.info("Firestore active and ready.")
    except Exception as e:
        logger.warning(f"Firestore not configured or initialization failed ({e}). Defaulting to SQLite database.")
        _is_firestore_enabled = False

def is_firestore_active() -> bool:
    return _is_firestore_enabled and _db_client is not None

def get_firestore_client():
    return _db_client

# ==================== Firestore Data Access Methods ====================

def firestore_create_user(user_id: str, email: str, full_name: str, hashed_password: str) -> Dict[str, Any]:
    if not is_firestore_active():
        return {}
    doc_ref = _db_client.collection("users").document(user_id)
    user_data = {
        "id": user_id,
        "email": email.lower(),
        "full_name": full_name,
        "hashed_password": hashed_password,
        "created_at": datetime.datetime.utcnow().isoformat()
    }
    doc_ref.set(user_data)
    return user_data

def firestore_get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    if not is_firestore_active():
        return None
    users_ref = _db_client.collection("users")
    query = users_ref.where("email", "==", email.lower()).limit(1).stream()
    for doc in query:
        return doc.to_dict()
    return None

def firestore_get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    if not is_firestore_active():
        return None
    doc_ref = _db_client.collection("users").document(user_id)
    doc = doc_ref.get()
    return doc.to_dict() if doc.exists else None

def firestore_save_trade(user_id: str, trade_dict: Dict[str, Any]) -> Dict[str, Any]:
    if not is_firestore_active():
        return {}
    trade_id = trade_dict.get("id") or f"th_{datetime.datetime.utcnow().timestamp()}"
    doc_ref = _db_client.collection("user_trade_history").document(trade_id)
    record = {
        "id": trade_id,
        "user_id": user_id,
        "strategy_name": trade_dict.get("strategy_name", ""),
        "symbol": trade_dict.get("symbol", ""),
        "side": trade_dict.get("side", "SELL"),
        "entry_date": trade_dict.get("entry_date", ""),
        "exit_date": trade_dict.get("exit_date", ""),
        "duration_bars": trade_dict.get("duration_bars", 0),
        "qty": float(trade_dict.get("qty", 0.0)),
        "entry_price": float(trade_dict.get("entry_price", 0.0)),
        "exit_price": float(trade_dict.get("exit_price", 0.0)),
        "pnl": float(trade_dict.get("pnl", 0.0)),
        "pnl_pct": float(trade_dict.get("pnl_pct", 0.0)),
        "commission": float(trade_dict.get("commission", 0.0)),
        "slippage": float(trade_dict.get("slippage", 0.0)),
        "created_at": datetime.datetime.utcnow().isoformat()
    }
    doc_ref.set(record)
    return record

def firestore_get_user_trades(user_id: str) -> List[Dict[str, Any]]:
    if not is_firestore_active():
        return []
    trades_ref = _db_client.collection("user_trade_history")
    query = trades_ref.where("user_id", "==", user_id).stream()
    trades = [doc.to_dict() for doc in query]
    trades.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return trades

def firestore_clear_user_trades(user_id: str):
    if not is_firestore_active():
        return
    trades_ref = _db_client.collection("user_trade_history")
    query = trades_ref.where("user_id", "==", user_id).stream()
    batch = _db_client.batch()
    for doc in query:
        batch.delete(doc.reference)
    batch.commit()
