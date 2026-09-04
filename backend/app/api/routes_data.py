"""
API routes for Ticker metadata and OHLCV market data.
"""

from fastapi import APIRouter, HTTPException, Query, Request
from typing import Optional
from app.engine.data_feed import get_available_symbols, get_ohlcv_data
from app.core.rate_limit import limiter

router = APIRouter(prefix="/api/data", tags=["Market Data"])

@router.get("/symbols")
def list_symbols():
    """Returns supported ticker symbols with descriptions."""
    return get_available_symbols()

@router.get("/ohlcv/{symbol}")
def fetch_ohlcv(symbol: str, force_refresh: bool = Query(False)):
    """Fetch OHLCV historical price series for given symbol."""
    df = get_ohlcv_data(symbol, force_refresh=force_refresh)
    if df.empty:
        raise HTTPException(status_code=404, detail=f"No price data found for {symbol}")
    return df.to_dict(orient="records")

@router.post("/refresh/{symbol}")
@limiter.limit("15/minute")
def refresh_symbol_cache(request: Request, symbol: str):
    """Force-refresh the OHLCV cache for a single symbol."""
    df = get_ohlcv_data(symbol, force_refresh=True)
    return {"status": "refreshed", "symbol": symbol.upper(), "rows": len(df)}
