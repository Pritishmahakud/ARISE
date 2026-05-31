const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

async function request(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

async function requestSafe(path, fallback = null) {
  try {
    return await request(path);
  } catch (err) {
    console.error(`Safe request failed for ${path}:`, err);
    return fallback;
  }
}

export async function searchSymbols(query) {
  return requestSafe(`/api/search?q=${encodeURIComponent(query)}`, []);
}

export async function fetchIndicesTape() {
  const indices = ["NIFTY 50", "BANKNIFTY", "FINNIFTY", "SENSEX"];
  const responses = await Promise.allSettled(
    indices.map((name) => request(`/api/index/${encodeURIComponent(name)}`)),
  );

  return responses
    .map((result, index) => ({ result, name: indices[index] }))
    .filter((item) => item.result.status === "fulfilled")
    .map((item) => ({
      name: item.name,
      quote: item.result.value.quote,
    }));
}

export async function fetchDashboardData(symbol, chartPeriod = "6mo", chartInterval = "1d") {
  const encodedSymbol = encodeURIComponent(symbol);

  const [overview, chart, news, analysis, screener] = await Promise.all([
    requestSafe(`/api/stock/${encodedSymbol}`),
    requestSafe(`/api/chart/${encodedSymbol}?period=${chartPeriod}&interval=${chartInterval}`),
    requestSafe(`/api/news/${encodedSymbol}`, { articles: [] }),
    requestSafe(`/api/analysis/${encodedSymbol}`),
    requestSafe(`/api/screener/top-volume`, []),
  ]);

  return { overview, chart, news, analysis, screener };
}

export async function fetchIndexDashboardData(name, chartPeriod = "6mo", chartInterval = "1d") {
  const encodedName = encodeURIComponent(name);

  const [overview, chart, news, analysis] = await Promise.all([
    requestSafe(`/api/index/${encodedName}`),
    requestSafe(`/api/chart/${encodedName}?period=${chartPeriod}&interval=${chartInterval}`),
    requestSafe(`/api/news/${encodedName}`, { articles: [] }),
    requestSafe(`/api/analysis/${encodedName}`),
  ]);

  return { overview, chart, news, analysis };
}

export async function fetchPredictions(symbol) {
  const encodedSymbol = encodeURIComponent(symbol);
  return requestSafe(`/api/predict/${encodedSymbol}/all`, null);
}

export async function fetchFNOData(symbol) {
  const encodedSymbol = encodeURIComponent(symbol);
  return requestSafe(`/api/fno/${encodedSymbol}`, null);
}

export async function fetchPredictionPath(symbol) {
  const encodedSymbol = encodeURIComponent(symbol);
  return requestSafe(`/api/predict/${encodedSymbol}/path`, null);
}

