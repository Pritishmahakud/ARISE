# Arise Backend

Starter FastAPI backend for an NSE-style stock dashboard.

## Run

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

## Endpoints

- `GET /health`
- `GET /api/search?q=reliance`
- `GET /api/stock/RELIANCE`
- `GET /api/index/NIFTY 50`
- `GET /api/chart/RELIANCE?period=6mo&interval=1d`
- `GET /api/news/RELIANCE`
- `GET /api/analysis/RELIANCE`
- `GET /api/screener/top-volume`
