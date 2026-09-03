"""
ChronoTrade FastAPI Server Entry Point.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.db.database import init_db
from app.api.routes_data import router as data_router
from app.api.routes_strategies import router as strategy_router
from app.api.routes_backtest import router as backtest_router
from app.api.routes_export import router as export_router
from app.api.routes_auth import router as auth_router

# Initialize Rate Limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

app = FastAPI(
    title="ChronoTrade Algorithmic Trading Simulator Engine",
    description="Institutional-grade web-based algorithmic backtesting and analytics engine.",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Middleware Configuration (Scoped Origins)
raw_origins = os.environ.get("CORS_ORIGINS", "")
if raw_origins:
    allowed_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
else:
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://chronotrade.vercel.app"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize databases
init_db()

# Register Routers
app.include_router(auth_router)
app.include_router(data_router)
app.include_router(strategy_router)
app.include_router(backtest_router)
app.include_router(export_router)

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "system": "ChronoTrade Quantitative Engine v1.0",
        "database": "sqlite"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
