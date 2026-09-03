# 🚀 ChronoTrade — Institutional-Grade Quantitative Strategy & Backtesting Terminal
[![CI Pipeline](https://github.com/collinsasaa/ChronoTrade/actions/workflows/ci.yml/badge.svg)](https://github.com/collinsasaa/ChronoTrade/actions/workflows/ci.yml)

ChronoTrade is a high-performance, web-based quantitative backtesting engine and algorithmic strategy simulator. Built for quantitative researchers, algorithmic traders, and software engineers, ChronoTrade incorporates real-world market friction modeling—including dynamic bid-ask spreads, volume/volatility slippage, broker commission schedules, Almgren-Chriss market impact, and latency constraints.

---

## 🌟 Key Architecture & Capabilities

* **Event-Driven Simulator:** Bar-by-bar execution loop enforcing strict lookahead bias prevention via `RollingWindowDataFeed`.
* **Real-World Market Friction:** Models dynamic bid-ask spreads, fixed/volatility/volume-scaled slippage, broker commission profiles (Interactive Brokers, Institutional, Zero-Fee), square-root market impact, and execution latency.
* **Institutional Risk & Analytics:** Calculates CAGR, Sharpe, Sortino, Calmar, Max Drawdown, Alpha, Beta vs SPY, Information Ratio, and 150+ path Monte Carlo forecasts.
* **Walk-Forward & Grid Optimization:** Rolling out-of-sample train/test window optimization and 2D parameter grid sweeps.
* **Custom Python Code Sandbox:** AST-validated and process-isolated custom strategy execution sandbox with strict execution timeouts.
* **Live WebSocket Replay:** Real-time animated bar-by-bar backtest playback controls.

---

## 🛠️ Tech Stack

* **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS 4, Zustand 5, Recharts, Monaco Editor (`@monaco-editor/react`), KaTeX.
* **Backend:** Python 3.11, FastAPI, Uvicorn, Pandas, NumPy, SciPy, Scikit-Learn, Statsmodels, yFinance, SQLAlchemy (SQLite), Passlib / bcrypt.
* **Deployment:** Vercel Global Edge CDN (Frontend) & Docker Container on Render.com (Backend).

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js:** v18+ and npm
* **Python:** v3.10+

---

### 1. Backend Setup (FastAPI Engine)

```bash
# Change directory to backend
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Run FastAPI development server
python app/main.py
```
The FastAPI backend server will be running live at `http://127.0.0.1:8000`. API documentation is available at `http://127.0.0.1:8000/docs`.

---

### 2. Frontend Setup (React Application)

```bash
# Change directory to frontend
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
The frontend application will be running live at `http://localhost:3000`.

---

## 🔑 Environment Variables Reference

Refer to [`backend/.env.example`](backend/.env.example) for backend configuration options:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `SECRET_KEY` | JWT signing secret key (Required in production) | Dev fallback key |
| `ENVIRONMENT` | Deployment environment (`production` / `development`) | `development` |
| `CORS_ORIGINS` | Comma-separated list of allowed CORS frontend origins | `http://localhost:3000,http://127.0.0.1:3000,https://chronotrade.vercel.app` |
| `PORT` | Server listening port | `8000` |
| `VITE_API_BASE_URL` | Frontend API base URL (Vite build) | Empty (uses local proxy) |

---

## 🧪 Running Tests

To run the backend test suite (100% test pass rate):

```bash
cd backend
python -m pytest tests -v
```

---

## 🌐 Production URLs

* **Live Frontend:** [https://chronotrade.vercel.app](https://chronotrade.vercel.app)
* **Live API Backend:** [https://chronotrade-ss33.onrender.com](https://chronotrade-ss33.onrender.com)

---

## ⚠️ Deployment Notes

* **Ephemeral OHLCV Cache:** The `backend/data/` directory stores cached OHLCV CSV files. On Render's free tier the filesystem is ephemeral — cache files reset on each deploy or container restart. This is best-effort caching, not a substitute for a persistent data store. A cache freshness TTL (default 24 hours, configurable via `CACHE_TTL_HOURS` env var) triggers automatic re-fetches from yfinance when data goes stale.
* **Persistent Postgres DB:** User accounts and trading history are now stored in a managed Postgres database (provisioned via `render.yaml`). **Note:** Render's free Postgres tier expires after ~30 days. If you are deploying this for anything beyond a demo or course project, it is highly recommended to upgrade to a low-cost paid database tier. If deploying manually on Render (not via Blueprint), you must create a Postgres instance in the dashboard and set the `DATABASE_URL` environment variable on the web service to its Internal Connection String.
* **Account Migration Note:** As part of the transition from ephemeral SQLite to persistent Postgres, existing accounts in the old SQLite file or JSON backups were not carried forward. All users must re-register a new account once.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
