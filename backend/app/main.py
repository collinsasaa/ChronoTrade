"""
ChronoTrade FastAPI Server Entry Point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import init_db
from app.api.routes_data import router as data_router
from app.api.routes_strategies import router as strategy_router
from app.api.routes_backtest import router as backtest_router
from app.api.routes_export import router as export_router
from app.api.routes_auth import router as auth_router

app = FastAPI(
    title="ChronoTrade Algorithmic Trading Simulator Engine",
    description="Institutional-grade web-based algorithmic backtesting and analytics engine.",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
