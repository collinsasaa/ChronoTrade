"""
ChronoTrade Database connection & ORM model definitions.
Supports persistent database storage across container restarts via DATABASE_URL or DB_PATH.
"""

from sqlalchemy import create_engine, Column, Integer, String, Float, Text, DateTime, JSON
from sqlalchemy.orm import declarative_base, sessionmaker
import datetime
import os

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

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
