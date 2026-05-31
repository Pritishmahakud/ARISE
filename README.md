# ARISE — Predictive Stock Trading Terminal

ARISE is a professional-grade, real-time trading terminal and stock market research dashboard. It leverages a Python FastAPI backend to stream live quotes, compute option Greeks, and generate multi-horizon AI price predictions, combined with a high-performance React/Vite frontend using Apache ECharts.

## 🚀 Live Demos
* **Live Website**: [https://arise-self.vercel.app](https://arise-self.vercel.app)
* **Backend API**: [https://arise-3ad8.onrender.com](https://arise-3ad8.onrender.com)

---

## 🏛️ Monorepo Architecture

The project is structured as a monorepo containing two decoupled, containerized services:

```text
├── Backend/          # FastAPI Python Web Server (Greeks & Predictions Engine)
├── Frontend/         # React + Vite Client Application (Interactive Terminal)
└── docker-compose.yml # Devops local orchestration
```

### 1. [Frontend Terminal (React + Vite)](./Frontend)
* **Interactive Charting Engine**: Apache ECharts-powered Candlestick, Heikin Ashi, OHLC, Line, and Area charts.
* **Indicator Calculator**: Client-side trend overlays (SMA, EMA, VWAP, Supertrend, Ichimoku, Parabolic SAR), momentum oscillators (RSI, Stochastic RSI, MACD, ROC), and volatility bands (Bollinger, Keltner).
* **F&O Analytics Suite**: Interactive Option Chain sheets, put-call ratio (PCR) metrics, and option Greeks comparison.
* **Alerting & Drawing**: Custom canvas drawing tools (trendlines, zones, Fibonacci retracement) and WebSocket-driven threshold price alerts.

### 2. [Backend Engine (FastAPI + Python)](./Backend)
* **Real-Time Data Streams**: Periodic WebSocket quote tick simulation with mean-reverting stochastic stabilization to emulate realistic stock action.
* **Option Greeks Calculations**: Black-Scholes mathematical calculations computing Delta ($\Delta$), Gamma ($\Gamma$), Theta ($\theta$), Vega ($\nu$), and Rho ($\rho$).
* **ML Price Forecasting**: 15-day multi-horizon predictive price paths with expanding Brownian motion confidence bands.
* **Performance Cache**: Optimized Redis/Memory-level caching for historical data.

---

## 🛠️ Local Development

You can run both services locally on your machine:

### Using Docker Compose (Easiest)
Run the entire platform with a single command from the root folder:
```bash
docker-compose up --build
```
* Frontend will be accessible at: `http://localhost:3000`
* Backend API will be accessible at: `http://localhost:8000`

### Running Services Separately
If you want to run the code without Docker:

#### 1. Setup Backend:
```bash
cd Backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### 2. Setup Frontend:
```bash
cd Frontend
npm install
npm run dev
```

---

## 🔒 License & Copyright
Copyright © 2026. All Rights Reserved. This project and its source code are proprietary. Unauthorized copying, modification, or distribution of this code is strictly prohibited.
