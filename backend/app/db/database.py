"""
ChronoTrade Database connection & ORM model definitions.
Supports persistent database storage across container restarts via DATABASE_URL, DB_PATH, and persistent JSON account backup auto-restoration.
"""

from sqlalchemy import create_engine, Column, Integer, String, Float, Text, DateTime, JSON
from sqlalchemy.orm import declarative_base, sessionmaker, Session
import datetime
import os
import json

db_url = os.environ.get("DATABASE_URL")
if db_url:
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URL = db_url
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
else:
    db_path = os.environ.get("DB_PATH")
    if not db_path:
        if os.path.exists("/var/data"):
            db_path = "/var/data/chronotrade.db"
        else:
            db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "chronotrade.db")
            
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class UserRecord(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class StrategyRecord(Base):
    __tablename__ = "strategies"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=True)
    name = Column(String, index=True)
    strategy_type = Column(String) # "momentum", "mean_reversion", "pairs_trading", "portfolio_opt", "ml", "custom"
    description = Column(Text, nullable=True)
    parameters = Column(JSON)
    custom_code = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class BacktestRunRecord(Base):
    __tablename__ = "backtest_runs"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=True)
    strategy_name = Column(String, index=True)
    symbol = Column(String, index=True)
    initial_capital = Column(Float)
    friction_config = Column(JSON)
    summary_metrics = Column(JSON)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class TradeHistoryRecord(Base):
    __tablename__ = "user_trade_history"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    strategy_name = Column(String, index=True)
    symbol = Column(String, index=True)
    side = Column(String)
    entry_date = Column(String)
    exit_date = Column(String)
    duration_bars = Column(Integer)
    qty = Column(Float)
    entry_price = Column(Float)
    exit_price = Column(Float)
    pnl = Column(Float)
    pnl_pct = Column(Float)
    commission = Column(Float)
    slippage = Column(Float)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

USERS_BACKUP_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "users_backup.json")

def backup_user(user_obj: UserRecord):
    """Save user account record to persistent JSON backup file so accounts survive server restarts."""
    try:
        os.makedirs(os.path.dirname(USERS_BACKUP_PATH), exist_ok=True)
        users = []
        if os.path.exists(USERS_BACKUP_PATH):
            try:
                with open(USERS_BACKUP_PATH, "r", encoding="utf-8") as f:
                    users = json.load(f)
            except Exception:
                users = []
                
        updated = False
        for u in users:
            if u["email"] == user_obj.email:
                u["hashed_password"] = user_obj.hashed_password
                u["full_name"] = user_obj.full_name
                updated = True
                break
                
        if not updated:
            created_str = user_obj.created_at.isoformat() if hasattr(user_obj.created_at, "isoformat") else str(user_obj.created_at)
            users.append({
                "id": user_obj.id,
                "email": user_obj.email,
                "full_name": user_obj.full_name,
                "hashed_password": user_obj.hashed_password,
                "created_at": created_str
            })
            
        with open(USERS_BACKUP_PATH, "w", encoding="utf-8") as f:
            json.dump(users, f, indent=2)
    except Exception as e:
        print(f"User account backup log error: {e}")

def restore_users_from_backup(db: Session):
    """On server startup, restore all registered user accounts from JSON backup file into DB."""
    try:
        if not os.path.exists(USERS_BACKUP_PATH):
            return
            
        with open(USERS_BACKUP_PATH, "r", encoding="utf-8") as f:
            users_data = json.load(f)
            
        restored = False
        for u_data in users_data:
            existing = db.query(UserRecord).filter(UserRecord.email == u_data["email"]).first()
            if not existing:
                try:
                    created_at_dt = datetime.datetime.fromisoformat(u_data["created_at"]) if "created_at" in u_data else datetime.datetime.utcnow()
                except Exception:
                    created_at_dt = datetime.datetime.utcnow()
                    
                new_user = UserRecord(
                    id=u_data.get("id", f"usr_{u_data['email']}"),
                    email=u_data["email"],
                    full_name=u_data.get("full_name", "User"),
                    hashed_password=u_data["hashed_password"],
                    created_at=created_at_dt
                )
                db.add(new_user)
                restored = True
                
        if restored:
            db.commit()
    except Exception as e:
        print(f"User account restoration error: {e}")

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        restore_users_from_backup(db)
    finally:
        db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
