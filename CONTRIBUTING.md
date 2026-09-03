# Contributing to ChronoTrade

Thank you for your interest in contributing to ChronoTrade! This guide covers how to run the project locally, execute tests, and submit changes.

## Prerequisites

- **Python 3.11+** for the backend
- **Node.js 22 LTS** for the frontend
- **Git**

## Local Development Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server proxies API requests to `http://localhost:8000`.

## Running Tests

### Backend Tests

```bash
cd backend
pytest tests/
```

All backend tests must pass before submitting a PR. The CI pipeline runs `pytest backend/tests/` automatically.

### Frontend Build & Lint

```bash
cd frontend
npm run lint    # oxlint static analysis
npm run build   # TypeScript type-check + Vite production build
```

Both `lint` and `build` must succeed. The CI pipeline runs both automatically.

## Branch & PR Convention

1. **Fork** the repository (external contributors) or create a **feature branch** off `main`:
   ```
   git checkout -b feature/your-feature-name
   ```
2. Make your changes, keeping commits focused and descriptive.
3. Ensure all tests pass locally before pushing.
4. Open a **Pull Request** against `main` with a clear description of what changes were made and why.
5. The CI pipeline will run automatically on your PR — all checks must pass before merge.

## Project Structure

```
ChronoTrade/
├── backend/           # FastAPI + Python engine
│   ├── app/           # Application source
│   │   ├── api/       # Route handlers
│   │   ├── db/        # Database models & sessions
│   │   └── engine/    # Simulation, strategies, analytics
│   ├── data/          # Cached OHLCV CSVs (ephemeral on Render)
│   └── tests/         # pytest test suite
├── frontend/          # React + TypeScript + Vite
│   └── src/
│       ├── components/  # UI components
│       └── store/       # Zustand state stores
└── .github/workflows/ # CI pipeline
```

## Notes

- The backend's `backend/data/` directory stores cached OHLCV CSV files. On Render's free tier, this cache resets on each deploy since the filesystem is ephemeral. This is best-effort caching, not a substitute for a persistent data store.
- Custom strategy code runs in a sandboxed process with a 10-second wall-clock timeout and a 10M iteration cap on `range()`.
