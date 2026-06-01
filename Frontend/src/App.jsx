import { useEffect, useMemo, useRef, useState } from "react";
import { Activity } from "lucide-react";

import {
  fetchDashboardData,
  fetchIndexDashboardData,
  fetchIndicesTape,
  fetchPredictions,
  searchSymbols,
} from "./api";

// Import dashboard components
import { TickerMarquee } from "./components/dashboard/TickerMarquee";
import { HeroSearch } from "./components/dashboard/HeroSearch";
import { StockOverviewCard } from "./components/dashboard/StockOverviewCard";
import { ChartCard } from "./components/dashboard/ChartCard";
import { AITradingCard } from "./components/dashboard/AITradingCard";
import { MLForecastCard } from "./components/dashboard/MLForecastCard";
import { NewsFeedSection } from "./components/dashboard/NewsFeedCard";
import { MarketPulseTable } from "./components/dashboard/MarketPulseTable";

// Import new tab components
import { SignalsPage } from "./components/dashboard/SignalsPage";
import { ScannerPage } from "./components/dashboard/ScannerPage";
import { SystemPage } from "./components/dashboard/SystemPage";


const DEFAULT_SYMBOL = "RELIANCE";
const SEARCH_CACHE = new Map();
const SEARCH_CACHE_TTL = 5 * 60 * 1000;

const INTERVAL_PERIOD_MAP = {
  "1min": "1d",
  "5min": "5d",
  "15min": "14d",
  "1hour": "60d",
  "4h": "60d",
  "1d": "6mo"
};

export default function App() {
  const [query, setQuery] = useState(DEFAULT_SYMBOL);
  const [selectedSymbol, setSelectedSymbol] = useState(DEFAULT_SYMBOL);
  const [searchResults, setSearchResults] = useState([]);
  const [chartInterval, setChartInterval] = useState("1d");
  const [activeNavTab, setActiveNavTab] = useState("Dashboard");
  
  const [dashboard, setDashboard] = useState(null);
  const [indicesTape, setIndicesTape] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [predictions, setPredictions] = useState(null);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  
  const [activeIndex, setActiveIndex] = useState(null);
  const [indexData, setIndexData] = useState(null);
  const [loadingIndex, setLoadingIndex] = useState(false);

  const debounceRef = useRef(null);

  // Search query debouncer
  useEffect(() => {
    const cacheKey = query.trim().toLowerCase();

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!cacheKey) {
      setSearchResults([]);
      setSearchLoading(false);
      return undefined;
    }

    debounceRef.current = setTimeout(async () => {
      const cached = SEARCH_CACHE.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
        setSearchResults(cached.results.slice(0, 8));
        setSearchLoading(false);
        return;
      }

      setSearchLoading(true);
      try {
        const results = await searchSymbols(query);
        SEARCH_CACHE.set(cacheKey, { results, timestamp: Date.now() });
        setSearchResults(results.slice(0, 8));
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 120);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Load indices tape
  useEffect(() => {
    let cancelled = false;

    async function loadIndices() {
      try {
        const data = await fetchIndicesTape();
        if (!cancelled) {
          setIndicesTape(data);
        }
      } catch {
        if (!cancelled) {
          setIndicesTape([]);
        }
      }
    }

    loadIndices();
    const intervalId = setInterval(loadIndices, 30000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  // Live WebSocket updates for the active symbol (stock or index)
  useEffect(() => {
    const symbolToSubscribe = activeIndex || selectedSymbol;
    if (!symbolToSubscribe) return undefined;

    const envUrl = import.meta.env.VITE_API_BASE_URL;
    let wsUrl;
    if (envUrl) {
      wsUrl = `${envUrl.replace(/^http/, "ws").replace(/\/$/, "")}/api/ws/live`;
    } else {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      let host = window.location.host;
      if (host.includes("5173")) {
        host = host.replace("5173", "8000");
      } else if (host.includes("3000")) {
        host = host.replace("3000", "8000");
      }
      wsUrl = `${protocol}//${host}/api/ws/live`;
    }

    let ws = null;
    let reconnectTimeout = null;

    function connect() {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        ws.send(JSON.stringify({ action: "subscribe", symbol: symbolToSubscribe }));
      };

      ws.onmessage = (event) => {
        try {
          const tick = JSON.parse(event.data);
          if (tick.symbol === symbolToSubscribe.toUpperCase()) {
            if (!activeIndex) {
              setDashboard((prev) => {
                if (!prev || !prev.overview || !prev.overview.quote) return prev;
                if (prev.overview.quote.symbol !== tick.symbol) return prev;
                return {
                  ...prev,
                  overview: {
                    ...prev.overview,
                    quote: {
                      ...prev.overview.quote,
                      current_price: tick.price,
                      percent_change: tick.percent_change,
                      volume: tick.volume,
                      day_high: tick.price > (prev.overview.quote.day_high || 0) ? tick.price : prev.overview.quote.day_high,
                      day_low: tick.price < (prev.overview.quote.day_low || Infinity) ? tick.price : prev.overview.quote.day_low,
                    },
                  },
                };
              });
            } else {
              setIndexData((prev) => {
                if (!prev || !prev.overview || !prev.overview.quote) return prev;
                if (prev.overview.quote.symbol !== tick.symbol) return prev;
                return {
                  ...prev,
                  overview: {
                    ...prev.overview,
                    quote: {
                      ...prev.overview.quote,
                      current_price: tick.price,
                      percent_change: tick.percent_change,
                      volume: tick.volume,
                      day_high: tick.price > (prev.overview.quote.day_high || 0) ? tick.price : prev.overview.quote.day_high,
                      day_low: tick.price < (prev.overview.quote.day_low || Infinity) ? tick.price : prev.overview.quote.day_low,
                    },
                  },
                };
              });
            }

            // Also update indicesTape if the tick symbol matches one of the indices in the marquee
            setIndicesTape((prevTape) => {
              if (!prevTape || prevTape.length === 0) return prevTape;
              return prevTape.map((item) => {
                const itemSymbol = item.quote?.symbol || item.name;
                if (
                  itemSymbol.toUpperCase() === tick.symbol.toUpperCase() ||
                  (item.name === "NIFTY 50" && tick.symbol === "^NSEI") ||
                  (item.name === "BANKNIFTY" && tick.symbol === "^NSEBANK") ||
                  (item.name === "FINNIFTY" && tick.symbol === "NIFTY_FIN_SERVICE.NS") ||
                  (item.name === "SENSEX" && tick.symbol === "^BSESN")
                ) {
                  return {
                    ...item,
                    quote: {
                      ...item.quote,
                      current_price: tick.price,
                      percent_change: tick.percent_change,
                    }
                  };
                }
                return item;
              });
            });
          }
        } catch (e) {
          console.error("App WebSocket message error", e);
        }
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [selectedSymbol, activeIndex]);

  // Fetch stock dashboard data
  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");
      
      const period = INTERVAL_PERIOD_MAP[chartInterval] || "6mo";

      try {
        const data = await fetchDashboardData(selectedSymbol, period, chartInterval);
        if (!cancelled) {
          setDashboard(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Failed to load dashboard data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (!activeIndex) {
      loadDashboard();
    }

    return () => {
      cancelled = true;
    };
  }, [selectedSymbol, chartInterval, activeIndex]);

  // Fetch ML forecasts
  useEffect(() => {
    let cancelled = false;

    async function loadPredictions() {
      setPredictionsLoading(true);
      try {
        const predData = await fetchPredictions(selectedSymbol);
        if (!cancelled) {
          setPredictions(predData?.predictions || null);
        }
      } catch {
        if (!cancelled) {
          setPredictions(null);
        }
      } finally {
        if (!cancelled) {
          setPredictionsLoading(false);
        }
      }
    }

    if (!activeIndex) {
      loadPredictions();
    }

    return () => {
      cancelled = true;
    };
  }, [selectedSymbol, activeIndex]);

  // Index tape details click
  async function handleIndexClick(indexName) {
    if (!indexName) return;
    setActiveIndex(indexName);
    setLoadingIndex(true);
    setError("");
    const period = INTERVAL_PERIOD_MAP[chartInterval] || "6mo";
    try {
      const data = await fetchIndexDashboardData(indexName, period, chartInterval);
      setIndexData(data);
    } catch {
      setIndexData(null);
      setError("Failed to load index data.");
    } finally {
      setLoadingIndex(false);
    }
  }

  function handleSearchSubmit(event) {
    if (event) event.preventDefault();
    if (!query.trim()) return;
    setSelectedSymbol(query.trim().toUpperCase());
    setActiveIndex(null);
    setActiveNavTab("Dashboard");
  }

  function handleSelectSymbol(symbol) {
    setQuery(symbol);
    setSelectedSymbol(symbol);
    setActiveIndex(null);
    setActiveNavTab("Dashboard");
  }

  const quote = dashboard?.overview?.quote;
  const technicals = dashboard?.overview?.technicals;
  const lastClosePrice = quote?.current_price;
  const currency = quote?.currency || "INR";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navigation */}
      <nav className="flex items-center justify-between px-6 py-3 border-b border-border/60 bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center glow-teal">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-foreground tracking-tight text-base uppercase">ARISE</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.72_0.18_162)] animate-pulse" />
            NSE Live &middot; Real-time Feed
          </div>
          <div className="flex items-center gap-1">
            {["Dashboard", "Signals", "Scanner", "System"].map(item => (
              <button
                key={item}
                className={`hidden md:block text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  activeNavTab === item
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
                onClick={() => {
                  setActiveNavTab(item);
                  setActiveIndex(null);
                  setIndexData(null);
                }}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-bold text-primary">
            AT
          </div>
        </div>
      </nav>

      {/* Ticker Tape */}
      <TickerMarquee items={indicesTape} onIndexClick={handleIndexClick} />

      {/* Hero Header & Search - Only on Dashboard Tab */}
      {activeNavTab === "Dashboard" && (
        <HeroSearch 
          query={query}
          setQuery={setQuery}
          searchResults={searchResults}
          searchLoading={searchLoading}
          activeStock={activeIndex || selectedSymbol}
          onSelectStock={handleSelectSymbol}
          onSubmit={handleSearchSubmit}
        />
      )}

      {error && (
        <div className="mx-6 mt-4 p-4 rounded-xl border border-loss bg-loss/10 text-loss text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Main Dashboard Layout */}
      <main className="flex-1 px-4 md:px-6 py-6 max-w-[1600px] mx-auto w-full">
        {activeNavTab === "Signals" ? (
          <SignalsPage onSelectStock={handleSelectSymbol} />
        ) : activeNavTab === "Scanner" ? (
          <ScannerPage onSelectStock={handleSelectSymbol} />
        ) : activeNavTab === "System" ? (
          <SystemPage />
        ) : activeIndex ? (
          /* INDEX PAGE VIEW */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-1 flex flex-col gap-5">
              <StockOverviewCard 
                symbol={activeIndex} 
                quote={indexData?.overview?.quote} 
                technicals={indexData?.overview?.technicals} 
              />
              <AITradingCard 
                analysis={indexData?.analysis} 
              />
            </div>
            <div className="lg:col-span-2">
              <ChartCard 
                symbol={activeIndex} 
                chart={indexData?.chart} 
                interval={chartInterval}
                onChangeInterval={setChartInterval}
                technicals={indexData?.overview?.technicals}
                loading={loadingIndex}
              />
              <div className="mt-5">
                <NewsFeedSection articles={indexData?.news?.articles || []} />
              </div>
            </div>
          </div>
        ) : (
          /* STOCK VIEW */
          <div className="flex flex-col gap-5">
            {/* Primary Row: Overview & Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-1">
                <StockOverviewCard 
                  symbol={selectedSymbol} 
                  quote={quote} 
                  technicals={technicals} 
                />
              </div>
              <div className="lg:col-span-2">
                <ChartCard 
                  symbol={selectedSymbol} 
                  chart={dashboard?.chart} 
                  interval={chartInterval}
                  onChangeInterval={setChartInterval}
                  technicals={technicals}
                  loading={loading}
                />
              </div>
            </div>

            {/* Secondary Row: AI Analysis & ML Forecasts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <AITradingCard 
                analysis={dashboard?.analysis} 
              />
              <MLForecastCard 
                symbol={selectedSymbol} 
                predictions={predictions} 
                lastClosePrice={lastClosePrice} 
                currency={currency}
                loading={predictionsLoading}
              />
            </div>

            {/* Tertiary Row: News & Pulse Screener */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
              <div className="xl:col-span-3">
                <NewsFeedSection articles={dashboard?.news?.articles || []} />
              </div>
              <div className="xl:col-span-2">
                <MarketPulseTable 
                  items={dashboard?.screener} 
                  activeStock={selectedSymbol} 
                  onSelectStock={handleSelectSymbol} 
                  />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 px-6 py-4 flex items-center justify-between text-[11px] text-muted-foreground bg-card/40">
        <span>
          &copy; 2026 Arise Predictive Terminal &middot; Educational Purpose Only &middot; Not Financial Advice
        </span>
        <span className="font-mono">Vite + FastAPI + Tailwind</span>
      </footer>
    </div>
  );
}
