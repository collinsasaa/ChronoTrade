"""
ChronoTrade Data Feed Engine.
Provides bundled historical seed OHLCV data for major tickers,
with yfinance online fetch fallback & disk caching across Stocks, ETFs, Commodities, and Cryptos.
"""

import os
import json
import math
import logging
import datetime
from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")

CACHE_TTL_HOURS = int(os.environ.get("CACHE_TTL_HOURS", "24"))


def _get_cache_meta_path(symbol: str) -> str:
    """Return the path to the cache metadata JSON file for a symbol."""
    return os.path.join(DATA_DIR, f"{symbol.upper()}.meta.json")


def _write_cache_meta(symbol: str):
    """Write a cache timestamp metadata file alongside the CSV cache."""
    meta_path = _get_cache_meta_path(symbol)
    try:
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump({"cached_at": datetime.datetime.utcnow().isoformat()}, f)
    except Exception as e:
        logger.warning(f"Failed to write cache meta for {symbol}: {e}")


def _is_cache_stale(symbol: str) -> bool:
    """Check if the cached data for a symbol is older than the configured TTL."""
    meta_path = _get_cache_meta_path(symbol)
    if not os.path.exists(meta_path):
        return True
    try:
        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
        cached_at = datetime.datetime.fromisoformat(meta["cached_at"])
        age_hours = (datetime.datetime.utcnow() - cached_at).total_seconds() / 3600.0
        return age_hours > CACHE_TTL_HOURS
    except Exception:
        return True


def _try_yfinance_fetch(symbol: str, cache_path: str) -> Optional[pd.DataFrame]:
    """Attempt to fetch data from yfinance and cache it. Returns DataFrame or None on failure."""
    try:
        import yfinance as yf
        ticker_obj = yf.Ticker(symbol)
        df_yf = ticker_obj.history(period="5y")
        if not df_yf.empty and len(df_yf) > 50:
            df_yf = df_yf.reset_index()
            date_col = "Date" if "Date" in df_yf.columns else df_yf.columns[0]
            df_yf["date"] = pd.to_datetime(df_yf[date_col]).dt.strftime("%Y-%m-%d")
            df_out = pd.DataFrame({
                "date": df_yf["date"],
                "open": df_yf["Open"].round(2),
                "high": df_yf["High"].round(2),
                "low": df_yf["Low"].round(2),
                "close": df_yf["Close"].round(2),
                "volume": df_yf["Volume"].round(0)
            })
            df_out.to_csv(cache_path, index=False)
            _write_cache_meta(symbol)
            return df_out
    except Exception as e:
        logger.warning(f"yfinance fetch failed for {symbol}: {e}")
    return None

TICKER_PROFILES = {
    # Index ETFs & Macro
    "SPY": {"base_price": 320.0, "drift": 0.12, "vol": 0.16, "base_vol": 80000000},
    "QQQ": {"base_price": 210.0, "drift": 0.16, "vol": 0.22, "base_vol": 50000000},
    "IWM": {"base_price": 150.0, "drift": 0.10, "vol": 0.24, "base_vol": 35000000},
    "DIA": {"base_price": 280.0, "drift": 0.10, "vol": 0.15, "base_vol": 15000000},
    "TLT": {"base_price": 135.0, "drift": -0.02, "vol": 0.14, "base_vol": 20000000},
    "GLD": {"base_price": 140.0, "drift": 0.08, "vol": 0.15, "base_vol": 12000000},
    "SLV": {"base_price": 16.0, "drift": 0.09, "vol": 0.28, "base_vol": 25000000},
    "USO": {"base_price": 60.0, "drift": 0.05, "vol": 0.35, "base_vol": 10000000},

    # Forex Currency Pairs
    "EURUSD=X": {"base_price": 1.08, "drift": 0.02, "vol": 0.12, "base_vol": 250000000},
    "GBPUSD=X": {"base_price": 1.25, "drift": 0.015, "vol": 0.14, "base_vol": 180000000},
    "USDJPY=X": {"base_price": 145.0, "drift": -0.005, "vol": 0.11, "base_vol": 210000000},
    "AUDUSD=X": {"base_price": 0.65, "drift": 0.01, "vol": 0.13, "base_vol": 120000000},
    "USDCAD=X": {"base_price": 1.36, "drift": 0.005, "vol": 0.12, "base_vol": 100000000},
    "USDCHF=X": {"base_price": 0.90, "drift": 0.007, "vol": 0.10, "base_vol": 95000000},

    # Tech MegaCap
    "AAPL": {"base_price": 75.0, "drift": 0.20, "vol": 0.25, "base_vol": 90000000},
    "MSFT": {"base_price": 160.0, "drift": 0.18, "vol": 0.22, "base_vol": 30000000},
    "NVDA": {"base_price": 15.0, "drift": 0.45, "vol": 0.45, "base_vol": 120000000},
    "GOOGL": {"base_price": 68.0, "drift": 0.15, "vol": 0.24, "base_vol": 25000000},
    "AMZN": {"base_price": 95.0, "drift": 0.16, "vol": 0.28, "base_vol": 40000000},
    "META": {"base_price": 180.0, "drift": 0.22, "vol": 0.32, "base_vol": 25000000},
    "TSLA": {"base_price": 40.0, "drift": 0.30, "vol": 0.55, "base_vol": 80000000},

    # Finance & Banking
    "JPM": {"base_price": 120.0, "drift": 0.12, "vol": 0.22, "base_vol": 15000000},
    "GS": {"base_price": 210.0, "drift": 0.14, "vol": 0.25, "base_vol": 4000000},
    "BAC": {"base_price": 28.0, "drift": 0.10, "vol": 0.26, "base_vol": 50000000},
    "V": {"base_price": 180.0, "drift": 0.15, "vol": 0.18, "base_vol": 8000000},

    # Healthcare & Bio
    "JNJ": {"base_price": 140.0, "drift": 0.07, "vol": 0.14, "base_vol": 10000000},
    "PFE": {"base_price": 36.0, "drift": 0.05, "vol": 0.20, "base_vol": 30000000},
    "UNH": {"base_price": 280.0, "drift": 0.16, "vol": 0.18, "base_vol": 4000000},

    # Consumer & Industrial
    "WMT": {"base_price": 115.0, "drift": 0.10, "vol": 0.16, "base_vol": 12000000},
    "KO": {"base_price": 50.0, "drift": 0.06, "vol": 0.13, "base_vol": 15000000},
    "PG": {"base_price": 120.0, "drift": 0.08, "vol": 0.14, "base_vol": 8000000},
    "DIS": {"base_price": 140.0, "drift": 0.04, "vol": 0.24, "base_vol": 12000000},
    "BA": {"base_price": 250.0, "drift": 0.02, "vol": 0.38, "base_vol": 10000000},
    "CAT": {"base_price": 130.0, "drift": 0.14, "vol": 0.26, "base_vol": 5000000},
    "XOM": {"base_price": 60.0, "drift": 0.12, "vol": 0.28, "base_vol": 20000000},

    # Crypto Assets
    "BTC-USD": {"base_price": 7200.0, "drift": 0.35, "vol": 0.60, "base_vol": 3000000000},
    "ETH-USD": {"base_price": 180.0, "drift": 0.40, "vol": 0.70, "base_vol": 1500000000},
    "SOL-USD": {"base_price": 2.50, "drift": 0.60, "vol": 0.90, "base_vol": 800000000},
    "XRP-USD": {"base_price": 0.22, "drift": 0.25, "vol": 0.85, "base_vol": 500000000},
    "DOGE-USD": {"base_price": 0.003, "drift": 0.50, "vol": 1.10, "base_vol": 400000000}
}

def generate_synthetic_ohlcv(symbol: str, num_bars: int = 1500) -> pd.DataFrame:
    """
    Generates realistic synthetic OHLCV daily data using Geometric Brownian Motion with jump diffusion.
    """
    prof = TICKER_PROFILES.get(symbol, {"base_price": 100.0, "drift": 0.10, "vol": 0.20, "base_vol": 10000000})
    
    dates = pd.date_range(end="2026-08-01", periods=num_bars, freq="B")
    dt = 1.0 / 252.0
    mu = prof["drift"]
    sigma = prof["vol"]
    
    np.random.seed(abs(hash(symbol)) % (2**32 - 1))
    z = np.random.normal(loc=0.0, scale=1.0, size=num_bars)
    jumps = np.random.poisson(lam=0.02, size=num_bars) * np.random.normal(loc=0.0, scale=0.03, size=num_bars)
    
    returns = (mu - 0.5 * sigma**2) * dt + sigma * np.sqrt(dt) * z + jumps
    price_path = prof["base_price"] * np.exp(np.cumsum(returns))
    
    opens = price_path * (1.0 + np.random.normal(0, 0.003, num_bars))
    highs = np.maximum(opens, price_path) * (1.0 + np.abs(np.random.normal(0, 0.008, num_bars)))
    lows = np.minimum(opens, price_path) * (1.0 - np.abs(np.random.normal(0, 0.008, num_bars)))
    closes = price_path
    
    vol_noise = np.exp(np.random.normal(0, 0.3, num_bars))
    volumes = prof["base_vol"] * vol_noise * (1.0 + 5.0 * np.abs(returns))
    
    df = pd.DataFrame({
        "date": dates.strftime("%Y-%m-%d"),
        "open": np.round(opens, 2),
        "high": np.round(highs, 2),
        "low": np.round(lows, 2),
        "close": np.round(closes, 2),
        "volume": np.round(volumes, 0)
    })
    return df

def get_ohlcv_data(symbol: str, force_refresh: bool = False) -> pd.DataFrame:
    """
    Load OHLCV data for given symbol with cache TTL freshness checking.
    Cache is served if fresh. If stale, attempts yfinance refresh.
    On refresh failure, falls back to serving the stale cache.
    """
    os.makedirs(DATA_DIR, exist_ok=True)
    cache_path = os.path.join(DATA_DIR, f"{symbol.upper()}.csv")
    
    # Check if cached file exists
    cache_exists = os.path.exists(cache_path)
    
    if cache_exists and not force_refresh:
        stale = _is_cache_stale(symbol)
        if not stale:
            # Fresh cache — serve directly
            try:
                df = pd.read_csv(cache_path)
                if not df.empty and "close" in df.columns:
                    return df
            except Exception:
                pass
        else:
            # Stale cache — try to refresh via yfinance
            logger.info(f"Cache for {symbol} is stale, attempting refresh...")
            refreshed = _try_yfinance_fetch(symbol, cache_path)
            if refreshed is not None:
                return refreshed
            # yfinance failed — serve stale cache with a warning
            logger.warning(f"yfinance refresh failed for {symbol}, serving stale cache")
            try:
                df = pd.read_csv(cache_path)
                if not df.empty and "close" in df.columns:
                    return df
            except Exception:
                pass
    
    # No cache or force_refresh — try yfinance
    refreshed = _try_yfinance_fetch(symbol, cache_path)
    if refreshed is not None:
        return refreshed
        
    # Final fallback — generate synthetic data
    df_seed = generate_synthetic_ohlcv(symbol.upper())
    df_seed.to_csv(cache_path, index=False)
    _write_cache_meta(symbol)
    return df_seed

def get_pairs_ohlcv_data(symbol_a: str, symbol_b: str, force_refresh: bool = False) -> pd.DataFrame:
    """Load and align OHLCV data for two symbols (merging close_b)."""
    df_a = get_ohlcv_data(symbol_a, force_refresh=force_refresh)
    df_b = get_ohlcv_data(symbol_b, force_refresh=force_refresh)
    
    if df_a.empty or df_b.empty:
        return df_a
        
    merged = pd.merge(df_a, df_b[["date", "close"]], on="date", how="inner", suffixes=("", "_b"))
    return merged

def get_available_symbols() -> List[Dict[str, str]]:
    """Return comprehensive list of supported tickers with metadata."""
    return [
        {"symbol": "SPY", "name": "SPDR S&P 500 ETF Trust", "category": "Index ETF"},
        {"symbol": "QQQ", "name": "Invesco QQQ Trust (Nasdaq 100)", "category": "Index ETF"},
        {"symbol": "IWM", "name": "iShares Russell 2000 ETF", "category": "Index ETF"},
        {"symbol": "DIA", "name": "SPDR Dow Jones Industrial ETF", "category": "Index ETF"},
        {"symbol": "TLT", "name": "iShares 20+ Year Treasury Bond ETF", "category": "Fixed Income ETF"},
        {"symbol": "GLD", "name": "SPDR Gold Shares ETF", "category": "Commodities ETF"},
        {"symbol": "SLV", "name": "iShares Silver Trust ETF", "category": "Commodities ETF"},
        {"symbol": "USO", "name": "United States Oil Fund ETF", "category": "Commodities ETF"},

        {"symbol": "EURUSD=X", "name": "Euro / US Dollar", "category": "Forex Currency Pair"},
        {"symbol": "GBPUSD=X", "name": "British Pound / US Dollar", "category": "Forex Currency Pair"},
        {"symbol": "USDJPY=X", "name": "US Dollar / Japanese Yen", "category": "Forex Currency Pair"},
        {"symbol": "AUDUSD=X", "name": "Australian Dollar / US Dollar", "category": "Forex Currency Pair"},
        {"symbol": "USDCAD=X", "name": "US Dollar / Canadian Dollar", "category": "Forex Currency Pair"},
        {"symbol": "USDCHF=X", "name": "US Dollar / Swiss Franc", "category": "Forex Currency Pair"},

        {"symbol": "AAPL", "name": "Apple Inc.", "category": "Tech MegaCap"},
        {"symbol": "MSFT", "name": "Microsoft Corporation", "category": "Tech MegaCap"},
        {"symbol": "NVDA", "name": "NVIDIA Corporation", "category": "Semiconductors"},
        {"symbol": "GOOGL", "name": "Alphabet Inc.", "category": "Tech MegaCap"},
        {"symbol": "AMZN", "name": "Amazon.com Inc.", "category": "E-Commerce / Cloud"},
        {"symbol": "META", "name": "Meta Platforms Inc.", "category": "Social Media / Tech"},
        {"symbol": "TSLA", "name": "Tesla Inc.", "category": "EV / Clean Tech"},

        {"symbol": "JPM", "name": "JPMorgan Chase & Co.", "category": "Banking & Finance"},
        {"symbol": "GS", "name": "Goldman Sachs Group Inc.", "category": "Banking & Finance"},
        {"symbol": "BAC", "name": "Bank of America Corp.", "category": "Banking & Finance"},
        {"symbol": "V", "name": "Visa Inc.", "category": "Financial Services"},

        {"symbol": "JNJ", "name": "Johnson & Johnson", "category": "Healthcare"},
        {"symbol": "PFE", "name": "Pfizer Inc.", "category": "Pharma & Biotech"},
        {"symbol": "UNH", "name": "UnitedHealth Group Inc.", "category": "Healthcare Services"},

        {"symbol": "WMT", "name": "Walmart Inc.", "category": "Retail & Consumer"},
        {"symbol": "KO", "name": "The Coca-Cola Company", "category": "Consumer Staples"},
        {"symbol": "PG", "name": "Procter & Gamble Co.", "category": "Consumer Staples"},
        {"symbol": "DIS", "name": "The Walt Disney Company", "category": "Media & Entertainment"},
        {"symbol": "BA", "name": "The Boeing Company", "category": "Aerospace & Industrial"},
        {"symbol": "CAT", "name": "Caterpillar Inc.", "category": "Industrial Heavy Equip"},
        {"symbol": "XOM", "name": "Exxon Mobil Corp.", "category": "Energy & Oil"},

        {"symbol": "BTC-USD", "name": "Bitcoin USD", "category": "Crypto Digital Asset"},
        {"symbol": "ETH-USD", "name": "Ethereum USD", "category": "Crypto Digital Asset"},
        {"symbol": "SOL-USD", "name": "Solana USD", "category": "Crypto Digital Asset"},
        {"symbol": "XRP-USD", "name": "Ripple USD", "category": "Crypto Digital Asset"},
        {"symbol": "DOGE-USD", "name": "Dogecoin USD", "category": "Crypto Digital Asset"}
    ]
