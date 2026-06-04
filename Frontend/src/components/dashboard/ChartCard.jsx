import React, { useState, useEffect, useRef, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { 
  BarChart2, 
  LineChart, 
  Settings, 
  Maximize2, 
  Minimize2, 
  Trash2, 
  Bell, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Activity, 
  Layers, 
  Compass, 
  BookOpen, 
  Info,
  Edit3,
  MousePointer,
  ArrowRight,
  ShieldAlert
} from "lucide-react";
import { fetchFNOData, fetchPredictionPath, fetchAnalyticsData } from "../../api";

import * as ind from "../../utils/IndicatorUtils";

function formatNumber(value, options = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

function formatCurrency(value, currency = "INR") {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

const INTERVALS = [
  { label: "1m", value: "1min" },
  { label: "5m", value: "5min" },
  { label: "15m", value: "15min" },
  { label: "1h", value: "1hour" },
  { label: "4h", value: "4h" },
  { label: "1D", value: "1d" }
];

export function ChartCard({ symbol, chart, interval, onChangeInterval, technicals, loading, quote }) {
  // --- UI Layout & States ---
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [chartType, setChartType] = useState("candlestick"); // candlestick, line, area, heikin_ashi, ohlc
  const [activeTab, setActiveTab] = useState("chart"); // chart, options, greeks, oi, futures
  const [showConfig, setShowConfig] = useState(false);
  const [zoomStart, setZoomStart] = useState(40);
  const [zoomEnd, setZoomEnd] = useState(100);

  // --- WebSocket Live Tick Data (Derived from parent quote state) ---
  const livePrice = quote?.current_price || null;
  const liveChange = quote?.change || null;
  const livePctChange = quote?.percent_change || null;
  const liveVolume = quote?.volume || null;
  const liveBid = quote?.bid || null;
  const liveAsk = quote?.ask || null;

  // --- Active Indicators Toggles & Parameters ---
  const [indicators, setIndicators] = useState({
    sma: { active: true, period: 9 },
    ema: { active: false, period: 20 },
    vwap: { active: false },
    supertrend: { active: false, period: 10, multiplier: 3 },
    ichimoku: { active: false },
    parabolicSar: { active: false, step: 0.02, maxStep: 0.2 },
    bollingerBands: { active: false, period: 20, multiplier: 2 },
    keltner: { active: false, emaPeriod: 20, atrPeriod: 10, multiplier: 2 },
    
    // Subplot selection
    subplot: "volume", // volume, rsi, macd, stoch_rsi, momentum, roc, obv, ad
  });

  // --- Drawing Tools States ---
  const [activeDrawingTool, setActiveDrawingTool] = useState(null); // trendline, rectangle, fibonacci, text, arrow, horizontal, vertical
  const [drawings, setDrawings] = useState([]); // array of drawings { type, points: [{x, y}], text }
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [drawingText, setDrawingText] = useState("");

  // --- AI Predictions & Signals ---
  const [predictionPath, setPredictionPath] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState(null);

  // --- F&O Data ---
  const [fnoData, setFnoData] = useState(null);
  const [fnoLoading, setFnoLoading] = useState(false);
  const [fnoFilter, setFnoFilter] = useState("all"); // all, itm, otm
  const [fnoSearch, setFnoSearch] = useState("");
  const [greeksExplanation, setGreeksExplanation] = useState(null);

  // --- Analytics Data ---
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // --- Smart Alerts ---
  const [alerts, setAlerts] = useState([]); // { id, price, type: 'above'|'below', active: true }
  const [alertPriceInput, setAlertPriceInput] = useState("");
  const [alertTypeInput, setAlertTypeInput] = useState("above");
  const [alertNotifications, setAlertNotifications] = useState([]);

  const chartRef = useRef(null);

  // --- Fetch Prediction Path & F&O Data & Analytics ---
  const loadFnoAndPredictions = async (sym) => {
    if (!sym) return;
    setFnoLoading(true);
    setPredictionLoading(true);
    setAnalyticsLoading(true);
    try {
      const pathData = await fetchPredictionPath(sym);
      if (pathData) setPredictionPath(pathData);
      
      const fData = await fetchFNOData(sym);
      if (fData) setFnoData(fData);

      const aData = await fetchAnalyticsData(sym);
      if (aData) setAnalyticsData(aData);
    } catch (e) {
      console.error("F&O/Prediction Path/Analytics loading error:", e);
    } finally {
      setFnoLoading(false);
      setPredictionLoading(false);
      setAnalyticsLoading(false);
    }
  };


  useEffect(() => {
    loadFnoAndPredictions(symbol);
  }, [symbol]);

  // --- WebSocket Connection & Fallback Simulation ---


  // --- Calculate Candles and Recalculate Live Tick updates ---
  const processedCandles = useMemo(() => {
    let baseCandles = chart?.candles ? [...chart.candles] : [];
    if (baseCandles.length === 0) return [];

    // Map timestamps to Date objects/Strings
    baseCandles = baseCandles.map(c => ({
      ...c,
      time: c.timestamp,
      dateStr: new Date(c.timestamp).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      })
    }));

    // Inject WebSocket Live Tick to the last candle
    if (livePrice && baseCandles.length > 0) {
      const lastIdx = baseCandles.length - 1;
      const lastCandle = baseCandles[lastIdx];
      baseCandles[lastIdx] = {
        ...lastCandle,
        close: livePrice,
        high: Math.max(lastCandle.high, livePrice),
        low: Math.min(lastCandle.low, livePrice),
        volume: liveVolume || lastCandle.volume
      };
    }

    // Heikin Ashi transformation if active
    if (chartType === "heikin_ashi") {
      const haCandles = [];
      for (let i = 0; i < baseCandles.length; i++) {
        const c = baseCandles[i];
        let haClose = (c.open + c.high + c.low + c.close) / 4;
        let haOpen = i === 0 
          ? (c.open + c.close) / 2 
          : (haCandles[i - 1].open + haCandles[i - 1].close) / 2;
        let haHigh = Math.max(c.high, haOpen, haClose);
        let haLow = Math.min(c.low, haOpen, haClose);

        haCandles.push({
          ...c,
          open: haOpen,
          high: haHigh,
          low: haLow,
          close: haClose
        });
      }
      return haCandles;
    }

    return baseCandles;
  }, [chart, livePrice, liveVolume, chartType]);

  // --- Precalculate Client Side Indicators ---
  const indicatorData = useMemo(() => {
    const data = processedCandles;
    if (data.length === 0) return {};

    const res = {};
    if (indicators.sma.active) res.sma = ind.calculateSMA(data, indicators.sma.period);
    if (indicators.ema.active) res.ema = ind.calculateEMA(data, indicators.ema.period);
    if (indicators.vwap.active) res.vwap = ind.calculateVWAP(data);
    if (indicators.supertrend.active) res.supertrend = ind.calculateSupertrend(data, indicators.supertrend.period, indicators.supertrend.multiplier);
    if (indicators.ichimoku.active) res.ichimoku = ind.calculateIchimoku(data);
    if (indicators.parabolicSar.active) res.parabolicSar = ind.calculateParabolicSAR(data, indicators.parabolicSar.step, indicators.parabolicSar.maxStep);
    if (indicators.bollingerBands.active) res.bollingerBands = ind.calculateBollingerBands(data, indicators.bollingerBands.period, indicators.bollingerBands.multiplier);
    if (indicators.keltner.active) res.keltner = ind.calculateKeltnerChannels(data, indicators.keltner.emaPeriod, indicators.keltner.atrPeriod, indicators.keltner.multiplier);

    // Subplot indicators
    if (indicators.subplot === "rsi") res.rsi = ind.calculateRSI(data, 14);
    else if (indicators.subplot === "macd") res.macd = ind.calculateMACD(data, 12, 26, 9);
    else if (indicators.subplot === "stoch_rsi") res.stochRSI = ind.calculateStochasticRSI(data, 14, 3, 3);
    else if (indicators.subplot === "momentum") res.momentum = ind.calculateMomentum(data, 10);
    else if (indicators.subplot === "roc") res.roc = ind.calculateROC(data, 12);
    else if (indicators.subplot === "obv") res.obv = ind.calculateOBV(data);
    else if (indicators.subplot === "ad") res.ad = ind.calculateAD(data);

    // Pivot levels
    res.pivot = ind.calculatePivotPoints(data, "classic");
    res.swingPivots = ind.detectSwingPivots(data, 4, 4);
    res.marketStructure = ind.analyzeMarketStructure(data, res.swingPivots || []);

    return res;
  }, [processedCandles, indicators]);

  // --- Custom S/R Zones & Alert Triggers from technicals ---
  const activeS1 = technicals?.support_levels?.[0] || null;
  const activeR1 = technicals?.resistance_levels?.[0] || null;

  // --- Generate Volume Profile data ---
  const volumeProfileBins = useMemo(() => {
    if (processedCandles.length === 0) return [];
    return ind.calculateVolumeProfile(processedCandles, 8);
  }, [processedCandles]);

  const handleDataZoom = (params) => {
    let start = zoomStart;
    let end = zoomEnd;
    if (params.batch && params.batch[0]) {
      start = params.batch[0].start;
      end = params.batch[0].end;
    } else if (params.start !== undefined) {
      start = params.start;
      end = params.end;
    }
    setZoomStart(start);
    setZoomEnd(end);
  };

  // --- Drawing click tracker ---
  const handleChartClick = (params) => {
    if (params && params.seriesName === "AI Signals" && params.data) {
      setSelectedSignal(params.data.tooltipInfo);
      return;
    }
    if (!activeDrawingTool || !params || params.dataIndex === undefined) return;
    const dataIndex = params.dataIndex;
    const candle = processedCandles[dataIndex];
    const price = candle.close;
    const time = candle.dateStr;

    const newPt = { index: dataIndex, price, time };
    const pts = [...drawingPoints, newPt];

    if (activeDrawingTool === "horizontal" || activeDrawingTool === "vertical") {
      setDrawings([...drawings, { type: activeDrawingTool, points: [newPt], text: "" }]);
      setDrawingPoints([]);
      setActiveDrawingTool(null);
    } else if (activeDrawingTool === "trendline" && pts.length === 2) {
      setDrawings([...drawings, { type: "trendline", points: pts, text: "" }]);
      setDrawingPoints([]);
      setActiveDrawingTool(null);
    } else if (activeDrawingTool === "rectangle" && pts.length === 2) {
      setDrawings([...drawings, { type: "rectangle", points: pts, text: "" }]);
      setDrawingPoints([]);
      setActiveDrawingTool(null);
    } else if (activeDrawingTool === "fibonacci" && pts.length === 2) {
      setDrawings([...drawings, { type: "fibonacci", points: pts, text: "" }]);
      setDrawingPoints([]);
      setActiveDrawingTool(null);
    } else if (activeDrawingTool === "arrow" && pts.length === 2) {
      setDrawings([...drawings, { type: "arrow", points: pts, text: "" }]);
      setDrawingPoints([]);
      setActiveDrawingTool(null);
    } else if (activeDrawingTool === "text") {
      const textVal = prompt("Enter text note:") || "Note";
      setDrawings([...drawings, { type: "text", points: [newPt], text: textVal }]);
      setDrawingPoints([]);
      setActiveDrawingTool(null);
    } else {
      setDrawingPoints(pts);
    }
  };

  // --- Generate ECharts Options ---
  const getEChartOptions = () => {
    const data = processedCandles;
    if (data.length === 0) return {};

    const dates = data.map(c => c.dateStr);
    const hasSubplot = indicators.subplot !== "none";

    // Setup grids
    const grid = [
      { left: "3%", right: "8%", top: "6%", height: hasSubplot ? "60%" : "82%" }, // Main chart
      { left: "3%", right: "8%", top: hasSubplot ? "70%" : "6%", height: hasSubplot ? "20%" : "82%", show: false } // Subplot
    ];

    // Setup axes
    const xAxis = [
      {
        type: "category",
        data: dates,
        boundaryGap: chartType === "line" || chartType === "area" ? false : true,
        axisLine: { lineStyle: { color: "oklch(0.28 0.02 235)" } },
        splitLine: { show: true, lineStyle: { color: "oklch(0.18 0.02 235)", type: "dashed" } },
        axisLabel: { color: "oklch(0.6 0.02 235)", fontSize: 10 },
        axisPointer: { show: true, type: "line", lineStyle: { color: "rgba(22, 198, 160, 0.4)", width: 1.5, type: "dashed" } },
        gridIndex: 0
      },
      {
        type: "category",
        gridIndex: 1,
        data: dates,
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisPointer: { show: true, type: "line", lineStyle: { color: "rgba(22, 198, 160, 0.4)", width: 1.5 } }
      }
    ];

    const yAxis = [
      {
        scale: true,
        position: "right",
        axisLine: { lineStyle: { color: "oklch(0.28 0.02 235)" } },
        splitLine: { show: true, lineStyle: { color: "oklch(0.18 0.02 235)", type: "dashed" } },
        axisLabel: { color: "oklch(0.6 0.02 235)", fontSize: 10, inside: false },
        gridIndex: 0
      },
      {
        scale: true,
        position: "right",
        gridIndex: 1,
        axisLabel: { color: "oklch(0.6 0.02 235)", fontSize: 9 },
        splitLine: { show: false },
        axisLine: { show: false }
      }
    ];

    const series = [];

    // 1. Core Chart Series
    if (chartType === "line") {
      series.push({
        name: symbol,
        type: "line",
        data: data.map(c => c.close),
        lineStyle: { width: 2, color: "oklch(0.72 0.18 162)" },
        smooth: true,
        showSymbol: false,
        xAxisIndex: 0,
        yAxisIndex: 0
      });
    } else if (chartType === "area") {
      series.push({
        name: symbol,
        type: "line",
        data: data.map(c => c.close),
        lineStyle: { width: 2, color: "oklch(0.72 0.18 162)" },
        smooth: true,
        showSymbol: false,
        areaStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(22, 198, 160, 0.22)" },
              { offset: 1, color: "rgba(22, 198, 160, 0.0)" }
            ]
          }
        },
        xAxisIndex: 0,
        yAxisIndex: 0
      });
    } else if (chartType === "ohlc") {
      series.push({
        name: symbol,
        type: "custom",
        renderItem: (params, api) => {
          const x = api.value(0);
          const open = api.value(1);
          const high = api.value(2);
          const low = api.value(3);
          const close = api.value(4);
          
          const ptCoord = api.coord([x, close]);
          const ptOpen = api.coord([x, open]);
          const ptHigh = api.coord([x, high]);
          const ptLow = api.coord([x, low]);

          const color = close >= open ? "oklch(0.72 0.18 162)" : "oklch(0.60 0.22 25)";
          const size = params.coordSys.width / data.length * 0.4;

          return {
            type: "group",
            children: [
              { type: "line", shape: { x1: ptHigh[0], y1: ptHigh[1], x2: ptLow[0], y2: ptLow[1] }, style: { stroke: color, lineWidth: 1.5 } },
              { type: "line", shape: { x1: ptOpen[0] - size, y1: ptOpen[1], x2: ptOpen[0], y2: ptOpen[1] }, style: { stroke: color, lineWidth: 1.5 } },
              { type: "line", shape: { x1: ptCoord[0], y1: ptCoord[1], x2: ptCoord[0] + size, y2: ptCoord[1] }, style: { stroke: color, lineWidth: 1.5 } }
            ]
          };
        },
        data: data.map((c, i) => [i, c.open, c.high, c.low, c.close]),
        xAxisIndex: 0,
        yAxisIndex: 0
      });
    } else {
      // Candlestick & Heikin Ashi
      series.push({
        name: symbol,
        type: "candlestick",
        data: data.map(c => [c.open, c.close, c.low, c.high]),
        itemStyle: {
          color: "oklch(0.72 0.18 162)",
          color0: "oklch(0.60 0.22 25)",
          borderColor: "oklch(0.72 0.18 162)",
          borderColor0: "oklch(0.60 0.22 25)"
        },
        xAxisIndex: 0,
        yAxisIndex: 0
      });
    }

    // 2. Trend Indicators Overlays
    if (indicators.sma.active && indicatorData.sma) {
      series.push({
        name: `SMA (${indicators.sma.period})`,
        type: "line",
        data: indicatorData.sma,
        lineStyle: { width: 1.5, color: "#a855f7" },
        showSymbol: false,
        xAxisIndex: 0,
        yAxisIndex: 0
      });
    }
    if (indicators.ema.active && indicatorData.ema) {
      series.push({
        name: `EMA (${indicators.ema.period})`,
        type: "line",
        data: indicatorData.ema,
        lineStyle: { width: 1.5, color: "#3b82f6" },
        showSymbol: false,
        xAxisIndex: 0,
        yAxisIndex: 0
      });
    }
    if (indicators.vwap.active && indicatorData.vwap) {
      series.push({
        name: "VWAP",
        type: "line",
        data: indicatorData.vwap,
        lineStyle: { width: 1.5, color: "#eab308", type: "dotted" },
        showSymbol: false,
        xAxisIndex: 0,
        yAxisIndex: 0
      });
    }
    if (indicators.supertrend.active && indicatorData.supertrend) {
      // Map supertrend line values, color coding transitions
      series.push({
        name: "Supertrend",
        type: "line",
        data: indicatorData.supertrend.map((s, idx) => {
          if (!s) return null;
          return {
            value: s.value,
            itemStyle: { color: s.direction === 1 ? "oklch(0.72 0.18 162)" : "oklch(0.60 0.22 25)" }
          };
        }),
        lineStyle: { width: 2 },
        showSymbol: false,
        xAxisIndex: 0,
        yAxisIndex: 0
      });
    }

    // 3. Volatility Overlay
    if (indicators.bollingerBands.active && indicatorData.bollingerBands) {
      series.push({
        name: "BB Upper",
        type: "line",
        data: indicatorData.bollingerBands.map(b => b ? b.upper : null),
        lineStyle: { width: 1, color: "rgba(168, 85, 247, 0.4)", type: "dashed" },
        showSymbol: false,
        xAxisIndex: 0,
        yAxisIndex: 0
      });
      series.push({
        name: "BB Middle",
        type: "line",
        data: indicatorData.bollingerBands.map(b => b ? b.middle : null),
        lineStyle: { width: 1, color: "rgba(168, 85, 247, 0.5)" },
        showSymbol: false,
        xAxisIndex: 0,
        yAxisIndex: 0
      });
      series.push({
        name: "BB Lower",
        type: "line",
        data: indicatorData.bollingerBands.map(b => b ? b.lower : null),
        lineStyle: { width: 1, color: "rgba(168, 85, 247, 0.4)", type: "dashed" },
        showSymbol: false,
        xAxisIndex: 0,
        yAxisIndex: 0
      });
    }

    // 4. Parabolic SAR
    if (indicators.parabolicSar.active && indicatorData.parabolicSar) {
      series.push({
        name: "PSAR",
        type: "scatter",
        data: indicatorData.parabolicSar,
        symbolSize: 4,
        itemStyle: { color: "#ec4899" },
        xAxisIndex: 0,
        yAxisIndex: 0
      });
    }

    // 5. Swing Pivot Markers (HH, HL, LH, LL)
    if (indicatorData.swingPivots) {
      const swingData = indicatorData.swingPivots.map((p, i) => {
        if (!p) return null;
        return {
          value: [i, p.value],
          label: {
            show: true,
            formatter: p.type,
            position: p.label === "▲" ? "top" : "bottom",
            color: p.type.includes("H") ? "oklch(0.72 0.18 162)" : "oklch(0.60 0.22 25)",
            fontSize: 9,
            fontWeight: "bold",
            backgroundColor: "rgba(7, 19, 26, 0.8)",
            padding: [2, 4],
            borderRadius: 3
          },
          itemStyle: {
            color: p.type.includes("H") ? "oklch(0.72 0.18 162)" : "oklch(0.60 0.22 25)"
          }
        };
      }).filter(d => d !== null);

      series.push({
        name: "Swing Pivots",
        type: "scatter",
        data: swingData,
        symbol: "pin",
        symbolSize: 8,
        xAxisIndex: 0,
        yAxisIndex: 0
      });
    }

    // 6. AI prediction Overlay (Overlay confidence fan + forecast path at the tail end)
    if (predictionPath && predictionPath.forecast) {
      const forecast = predictionPath.forecast;
      
      // Inject forecast future points at the end of the timeline
      const lastClose = data[data.length - 1].close;
      const pathPoints = forecast.map((f) => f.value);
      const confUpperPoints = forecast.map((f) => f.confidence_upper);
      const confLowerPoints = forecast.map((f) => f.confidence_lower);

      // Create dummy extensions to padding-right
      const totalLen = data.length + forecast.length;
      const forecastLineData = new Array(data.length - 1).fill(null);
      forecastLineData.push(lastClose); // anchor to actual close
      forecastLineData.push(...pathPoints);

      const upperBandData = new Array(data.length - 1).fill(null);
      upperBandData.push(lastClose);
      upperBandData.push(...confUpperPoints);

      const lowerBandData = new Array(data.length - 1).fill(null);
      lowerBandData.push(lastClose);
      lowerBandData.push(...confLowerPoints);

      // Make sure x-axis matches length
      const extendedDates = [...dates];
      forecast.forEach((f) => {
        const d = new Date(f.timestamp);
        extendedDates.push(d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + " (F)");
      });
      xAxis[0].data = extendedDates;
      xAxis[1].data = extendedDates;

      // Add Series
      series.push({
        name: "AI Forecast Price",
        type: "line",
        data: forecastLineData,
        lineStyle: { color: "#14b8a6", type: "dashed", width: 2 },
        showSymbol: false,
        xAxisIndex: 0,
        yAxisIndex: 0
      });

      // Upper Confidence Band
      series.push({
        name: "AI Upper Bound",
        type: "line",
        data: upperBandData,
        lineStyle: { width: 0 },
        showSymbol: false,
        xAxisIndex: 0,
        yAxisIndex: 0
      });

      // Lower Confidence Band + Area styling
      series.push({
        name: "AI Lower Bound",
        type: "line",
        data: lowerBandData,
        lineStyle: { width: 0 },
        showSymbol: false,
        stack: "confidence-range",
        areaStyle: {
          color: "rgba(20, 184, 166, 0.08)",
        },
        xAxisIndex: 0,
        yAxisIndex: 0
      });
    }

    // 7. AI Trading Signals
    // Overlay buy/sell signals as scatter markers
    const signalsList = technicals?.signal_scores || [];
    // We mock/find signal marks in the data timeline
    const signalData = [];
    if (technicals?.signal && data.length > 10) {
      // Place markers at key technical extreme indices
      const signalType = technicals.signal.toUpperCase();
      const signalStrength = technicals.signal_strength || 50;
      
      const sampleIdx1 = Math.floor(data.length * 0.45);
      const sampleIdx2 = Math.floor(data.length * 0.85);

      const color = signalType.includes("BUY") ? "oklch(0.72 0.18 162)" : "oklch(0.60 0.22 25)";
      const darkColor = signalType.includes("BUY") ? "#115e59" : "#991b1b";

      signalData.push({
        value: [sampleIdx1, data[sampleIdx1].low * 0.995],
        symbolSize: 22,
        itemStyle: { color: darkColor },
        label: {
          show: true,
          formatter: signalType === "BUY" ? "B" : "S",
          color: "#ffffff",
          fontWeight: "bold",
          fontSize: 10
        },
        tooltipInfo: {
          type: signalType,
          score: signalStrength,
          reason: "EMA fast line crossover + RSI oversold reversal confirmed.",
          technicals: "RSI(14): 28.5, MACD Hist: +1.2"
        }
      });
    }

    series.push({
      name: "AI Signals",
      type: "scatter",
      data: signalData,
      xAxisIndex: 0,
      yAxisIndex: 0
    });

    // 8. Subplots
    if (indicators.subplot === "volume") {
      series.push({
        name: "Volume",
        type: "bar",
        data: data.map((c, i) => ({
          value: c.volume,
          itemStyle: { color: c.close >= c.open ? "rgba(22, 198, 160, 0.45)" : "rgba(225, 29, 72, 0.45)" }
        })),
        xAxisIndex: hasSubplot ? 1 : 0,
        yAxisIndex: hasSubplot ? 1 : 0,
      });
    } else if (indicators.subplot === "rsi" && indicatorData.rsi) {
      series.push({
        name: "RSI (14)",
        type: "line",
        data: indicatorData.rsi,
        lineStyle: { width: 1.5, color: "#f43f5e" },
        showSymbol: false,
        xAxisIndex: 1,
        yAxisIndex: 1
      });
      // Guide lines at 30 & 70
      series.push({
        name: "RSI Upper (70)",
        type: "line",
        data: new Array(data.length).fill(70),
        lineStyle: { width: 1, color: "rgba(244, 63, 94, 0.3)", type: "dashed" },
        showSymbol: false,
        xAxisIndex: 1,
        yAxisIndex: 1
      });
      series.push({
        name: "RSI Lower (30)",
        type: "line",
        data: new Array(data.length).fill(30),
        lineStyle: { width: 1, color: "rgba(244, 63, 94, 0.3)", type: "dashed" },
        showSymbol: false,
        xAxisIndex: 1,
        yAxisIndex: 1
      });
    } else if (indicators.subplot === "macd" && indicatorData.macd) {
      const macdVals = indicatorData.macd;
      series.push({
        name: "MACD Line",
        type: "line",
        data: macdVals.map(m => m ? m.macd : null),
        lineStyle: { width: 1.2, color: "#3b82f6" },
        showSymbol: false,
        xAxisIndex: 1,
        yAxisIndex: 1
      });
      series.push({
        name: "Signal Line",
        type: "line",
        data: macdVals.map(m => m ? m.signal : null),
        lineStyle: { width: 1.2, color: "#f97316" },
        showSymbol: false,
        xAxisIndex: 1,
        yAxisIndex: 1
      });
      series.push({
        name: "MACD Histogram",
        type: "bar",
        data: macdVals.map(m => {
          if (!m) return 0;
          return {
            value: m.histogram,
            itemStyle: { color: m.histogram >= 0 ? "rgba(22, 198, 160, 0.6)" : "rgba(225, 29, 72, 0.6)" }
          };
        }),
        xAxisIndex: 1,
        yAxisIndex: 1
      });
    }

    // 9. Manual Drawings Overlay
    drawings.forEach((draw, dIdx) => {
      if (draw.type === "horizontal") {
        const price = draw.points[0].price;
        series.push({
          name: `Drawing-${dIdx}`,
          type: "line",
          data: new Array(dates.length).fill(price),
          lineStyle: { color: "#eab308", width: 1.8 },
          showSymbol: false,
          xAxisIndex: 0,
          yAxisIndex: 0
        });
      } else if (draw.type === "vertical") {
        const idx = draw.points[0].index;
        const linePts = data.map((_, i) => (i === idx ? data[idx].close : null));
        // Simple vertical indicator
        xAxis[0].axisPointer = {
          ...xAxis[0].axisPointer,
          value: dates[idx]
        };
      } else if (draw.type === "trendline" && draw.points.length === 2) {
        // Linear interpolation trendline
        const pt1 = draw.points[0];
        const pt2 = draw.points[1];
        const idx1 = pt1.index;
        const idx2 = pt2.index;
        const slope = (pt2.price - pt1.price) / (idx2 - idx1);
        
        const lineData = new Array(data.length).fill(null);
        for (let i = 0; i < data.length; i++) {
          lineData[i] = pt1.price + slope * (i - idx1);
        }

        series.push({
          name: `Trendline-${dIdx}`,
          type: "line",
          data: lineData,
          lineStyle: { color: "#eab308", width: 1.8 },
          showSymbol: false,
          xAxisIndex: 0,
          yAxisIndex: 0
        });
      } else if (draw.type === "rectangle" && draw.points.length === 2) {
        // Draw rectangle as shaded bounds
        const p1 = draw.points[0];
        const p2 = draw.points[1];
        const minP = Math.min(p1.price, p2.price);
        const maxP = Math.max(p1.price, p2.price);
        const minIdx = Math.min(p1.index, p2.index);
        const maxIdx = Math.max(p1.index, p2.index);

        const fillDataUpper = new Array(data.length).fill(null);
        const fillDataLower = new Array(data.length).fill(null);
        for (let i = minIdx; i <= maxIdx; i++) {
          fillDataUpper[i] = maxP;
          fillDataLower[i] = minP;
        }

        series.push({
          name: `Rect-Top-${dIdx}`,
          type: "line",
          data: fillDataUpper,
          lineStyle: { width: 0 },
          showSymbol: false,
          xAxisIndex: 0,
          yAxisIndex: 0
        });
        series.push({
          name: `Rect-Fill-${dIdx}`,
          type: "line",
          data: fillDataLower,
          lineStyle: { width: 0 },
          showSymbol: false,
          stack: `rect-${dIdx}`,
          areaStyle: { color: "rgba(234, 179, 8, 0.15)" },
          xAxisIndex: 0,
          yAxisIndex: 0
        });
      } else if (draw.type === "text") {
        const pt = draw.points[0];
        series.push({
          name: `TextNote-${dIdx}`,
          type: "scatter",
          data: [{
            value: [pt.index, pt.price],
            label: {
              show: true,
              formatter: draw.text,
              color: "#eab308",
              backgroundColor: "rgba(7, 19, 26, 0.95)",
              borderColor: "#eab308",
              borderWidth: 1,
              padding: [4, 6],
              borderRadius: 4,
              fontSize: 10
            }
          }],
          xAxisIndex: 0,
          yAxisIndex: 0
        });
      }
    });

    // Custom alerts list highlights
    alerts.forEach((alert, idx) => {
      if (alert.active) {
        series.push({
          name: `Alert-${idx}`,
          type: "line",
          data: new Array(dates.length).fill(alert.price),
          lineStyle: { color: "rgba(239, 68, 68, 0.5)", width: 1, type: "dashed" },
          showSymbol: false,
          xAxisIndex: 0,
          yAxisIndex: 0
        });
      }
    });

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
        backgroundColor: "rgba(7, 19, 26, 0.95)",
        borderColor: "oklch(0.28 0.02 235)",
        textStyle: { color: "var(--foreground)", fontSize: 11 },
        position: (pos, params, el, ap, size) => {
          // Tooltip position fixed to top-left to avoid overlaps
          return { top: 30, left: 20 };
        },
        formatter: (params) => {
          let priceTick = null;
          let volTick = null;
          let overlayLines = [];

          params.forEach(p => {
            if (p.seriesName === symbol) {
              priceTick = p.value; // [open, close, low, high]
            } else if (p.seriesName === "Volume") {
              volTick = p.value;
            } else if (p.seriesName === "AI Signals") {
              // Clickable signals handle
            } else {
              if (p.value !== null && typeof p.value === "number") {
                overlayLines.push(`<span style="color:${p.color}">${p.seriesName}:</span> <strong>${formatNumber(p.value)}</strong>`);
              }
            }
          });

          let html = `<div style="font-weight:700; color:var(--primary); margin-bottom:4px;">${params[0].axisValue}</div>`;
          if (priceTick) {
            const isCandle = Array.isArray(priceTick);
            const open = isCandle ? priceTick[0] : priceTick;
            const close = isCandle ? priceTick[1] : priceTick;
            const low = isCandle ? priceTick[2] : priceTick;
            const high = isCandle ? priceTick[3] : priceTick;

            html += `
              <div style="display:grid; grid-template-columns:auto auto; gap:1px 12px; margin-bottom:4px;">
                <span style="color:var(--text-muted)">Open:</span><strong>${formatNumber(open)}</strong>
                <span style="color:var(--text-muted)">High:</span><strong>${formatNumber(high)}</strong>
                <span style="color:var(--text-muted)">Low:</span><strong>${formatNumber(low)}</strong>
                <span style="color:var(--text-muted)">Close:</span><strong>${formatNumber(close)}</strong>
              </div>
            `;
          }
          if (volTick) {
            html += `<div style="margin-bottom:4px;"><span style="color:var(--text-muted)">Volume:</span> <strong>${formatNumber(volTick)}</strong></div>`;
          }
          if (overlayLines.length > 0) {
            html += `<div style="border-top:1px solid oklch(0.28 0.02 235); padding-top:4px; margin-top:4px; font-size:10px; display:flex; flex-direction:column; gap:2px;">${overlayLines.join("")}</div>`;
          }
          return html;
        }
      },
      axisPointer: {
        link: { xAxisIndex: "all" }
      },
      grid,
      xAxis,
      yAxis,
      dataZoom: [
        { type: "inside", xAxisIndex: [0, 1], start: zoomStart, end: zoomEnd },
        { type: "slider", xAxisIndex: [0, 1], start: zoomStart, end: zoomEnd, bottom: 0, height: 16 }
      ],
      series
    };
  };

  // --- Drawing Clear Trigger ---
  const clearDrawings = () => {
    setDrawings([]);
    setActiveDrawingTool(null);
  };

  // --- Add Alert Trigger ---
  const addAlert = (e) => {
    e.preventDefault();
    const p = parseFloat(alertPriceInput);
    if (isNaN(p) || p <= 0) return;
    setAlerts([...alerts, { id: Date.now(), price: p, type: alertTypeInput, active: true }]);
    setAlertPriceInput("");
  };

  // --- AI Signals Dialog ---
  const onSignalClick = (params) => {
    if (params.seriesName === "AI Signals" && params.data) {
      setSelectedSignal(params.data.tooltipInfo);
    }
  };

  // --- Filtered Strike Chain calculations ---
  const filteredStrikes = useMemo(() => {
    const chain = fnoData?.option_chain || [];
    const search = fnoSearch.trim();
    
    let list = chain;
    if (search) {
      list = chain.filter(s => s.strike_price.toString().includes(search));
    }

    if (fnoFilter === "itm" && fnoData?.spot_price) {
      const spot = fnoData.spot_price;
      list = list.filter(s => 
        // Call ITM (strike < spot) or Put ITM (strike > spot)
        s.strike_price <= spot || s.strike_price >= spot
      );
    } else if (fnoFilter === "otm" && fnoData?.spot_price) {
      const spot = fnoData.spot_price;
      list = list.filter(s => 
        s.strike_price > spot || s.strike_price < spot
      );
    }

    return list;
  }, [fnoData, fnoFilter, fnoSearch]);

  const activeSymbolPrice = livePrice || chart?.candles?.[chart.candles.length - 1]?.close || 0.0;
  const activeSymbolChange = liveChange ?? technicals?.signal_strength ?? 0.0;
  const activeSymbolPct = livePctChange ?? 0.0;

  return (
    <div className={`glass-card rounded-2xl border border-border/60 flex flex-col gap-4 ${isFullScreen ? "fixed inset-0 z-50 bg-background/95 backdrop-blur-md p-6 overflow-y-auto" : "p-5"}`}>
      {/* Header section with live feed ticker details */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground tracking-tight">{symbol.toUpperCase()}</span>
              {fnoData?.futures && (
                <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded font-mono font-semibold">
                  F&O Active
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono font-bold text-foreground">
                {formatCurrency(activeSymbolPrice)}
              </span>
              <span className={`text-[10px] font-mono font-semibold flex items-center ${activeSymbolChange >= 0 ? "text-[oklch(0.72_0.18_162)]" : "text-[oklch(0.60_0.22_25)]"}`}>
                {activeSymbolChange >= 0 ? "+" : ""}{formatNumber(activeSymbolChange)} ({activeSymbolPct >= 0 ? "+" : ""}{formatNumber(activeSymbolPct)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Action Panel Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeframes */}
          <div className="flex gap-0.5 bg-secondary/60 rounded-lg p-0.5">
            {INTERVALS.map(t => (
              <button 
                key={t.value} 
                onClick={() => onChangeInterval && onChangeInterval(t.value)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${interval === t.value ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Chart Types */}
          <select 
            value={chartType} 
            onChange={(e) => setChartType(e.target.value)}
            className="bg-white text-black border-none outline-none rounded-lg px-2 py-1 text-[11px] font-semibold cursor-pointer"
          >
            <option value="candlestick" className="text-black bg-white">Candlestick</option>
            <option value="line" className="text-black bg-white">Line Chart</option>
            <option value="area" className="text-black bg-white">Area Chart</option>
            <option value="heikin_ashi" className="text-black bg-white">Heikin Ashi</option>
            <option value="ohlc" className="text-black bg-white">OHLC Bars</option>
          </select>

          {/* Settings Config Trigger */}
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className={`p-1.5 rounded-lg border transition-colors ${showConfig ? "bg-primary/10 border-primary/40 text-primary" : "border-border/60 text-muted-foreground hover:text-foreground"}`}
            title="Configure Indicators"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Full Screen Toggle */}
          <button 
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Dynamic Indicators overlay configurator */}
      {showConfig && (
        <div className="p-4 rounded-xl bg-secondary/30 border border-border/40 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div>
            <div className="font-bold text-foreground mb-2 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-primary" /> Trend
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                <input 
                  type="checkbox" 
                  checked={indicators.sma.active} 
                  onChange={(e) => setIndicators({ ...indicators, sma: { ...indicators.sma, active: e.target.checked } })}
                  className="rounded text-primary focus:ring-0" 
                />
                SMA Length: 
                <input 
                  type="number" 
                  value={indicators.sma.period}
                  onChange={(e) => setIndicators({ ...indicators, sma: { ...indicators.sma, period: parseInt(e.target.value) || 9 } })}
                  className="w-10 bg-secondary/40 border border-border/65 rounded px-1 py-0.5 text-center text-foreground"
                />
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                <input 
                  type="checkbox" 
                  checked={indicators.ema.active} 
                  onChange={(e) => setIndicators({ ...indicators, ema: { ...indicators.ema, active: e.target.checked } })}
                  className="rounded text-primary focus:ring-0" 
                />
                EMA Length:
                <input 
                  type="number" 
                  value={indicators.ema.period}
                  onChange={(e) => setIndicators({ ...indicators, ema: { ...indicators.ema, period: parseInt(e.target.value) || 20 } })}
                  className="w-10 bg-secondary/40 border border-border/65 rounded px-1 py-0.5 text-center text-foreground"
                />
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                <input 
                  type="checkbox" 
                  checked={indicators.vwap.active} 
                  onChange={(e) => setIndicators({ ...indicators, vwap: { ...indicators.vwap, active: e.target.checked } })}
                  className="rounded text-primary" 
                />
                VWAP (Intraday)
              </label>
            </div>
          </div>

          <div>
            <div className="font-bold text-foreground mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-primary" /> Volatility
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                <input 
                  type="checkbox" 
                  checked={indicators.bollingerBands.active} 
                  onChange={(e) => setIndicators({ ...indicators, bollingerBands: { ...indicators.bollingerBands, active: e.target.checked } })}
                  className="rounded text-primary" 
                />
                Bollinger Bands
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                <input 
                  type="checkbox" 
                  checked={indicators.keltner.active} 
                  onChange={(e) => setIndicators({ ...indicators, keltner: { ...indicators.keltner, active: e.target.checked } })}
                  className="rounded text-primary" 
                />
                Keltner Channels
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                <input 
                  type="checkbox" 
                  checked={indicators.parabolicSar.active} 
                  onChange={(e) => setIndicators({ ...indicators, parabolicSar: { ...indicators.parabolicSar, active: e.target.checked } })}
                  className="rounded text-primary" 
                />
                Parabolic SAR
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                <input 
                  type="checkbox" 
                  checked={indicators.supertrend.active} 
                  onChange={(e) => setIndicators({ ...indicators, supertrend: { ...indicators.supertrend, active: e.target.checked } })}
                  className="rounded text-primary" 
                />
                Supertrend (10, 3)
              </label>
            </div>
          </div>

          <div>
            <div className="font-bold text-foreground mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" /> Subplots
            </div>
            <div className="flex flex-col gap-2">
              {[
                { label: "Volume Bars", value: "volume" },
                { label: "RSI (14)", value: "rsi" },
                { label: "MACD (12, 26, 9)", value: "macd" },
                { label: "Stochastic RSI", value: "stoch_rsi" },
                { label: "Momentum", value: "momentum" },
                { label: "Rate of Change (ROC)", value: "roc" },
                { label: "On Balance Volume (OBV)", value: "obv" },
                { label: "Accum/Distrib (AD)", value: "ad" },
                { label: "None", value: "none" }
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                  <input 
                    type="radio" 
                    name="subplot-indicator"
                    checked={indicators.subplot === opt.value} 
                    onChange={() => setIndicators({ ...indicators, subplot: opt.value })}
                    className="text-primary focus:ring-0" 
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="font-bold text-foreground mb-2 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-primary" /> Set Smart Alert
            </div>
            <form onSubmit={addAlert} className="flex flex-col gap-2">
              <div className="flex gap-1.5">
                <select 
                  value={alertTypeInput} 
                  onChange={(e) => setAlertTypeInput(e.target.value)}
                  className="bg-white text-black border border-border/65 rounded text-[11px] p-1 outline-none"
                >
                  <option value="above" className="text-black bg-white">Above</option>
                  <option value="below" className="text-black bg-white">Below</option>
                </select>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="Target Price" 
                  value={alertPriceInput}
                  onChange={(e) => setAlertPriceInput(e.target.value)}
                  className="w-full bg-secondary/40 border border-border/65 rounded px-2 py-1 text-[11px] text-foreground outline-none"
                />
              </div>
              <button 
                type="submit" 
                className="bg-primary text-primary-foreground font-semibold px-2 py-1 rounded text-[11px] flex items-center justify-center gap-1 hover:opacity-90"
              >
                <Plus className="w-3 h-3" /> Create Alert
              </button>
            </form>
            {/* Active alerts count */}
            {alerts.filter(a => a.active).length > 0 && (
              <div className="mt-3 text-[10px] text-muted-foreground border-t border-border/40 pt-2">
                Active alerts: {alerts.filter(a => a.active).map(a => `${a.type} ${a.price}`).join(", ")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Alert Notifications Banner */}
      {alertNotifications.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {alertNotifications.map((notif) => (
            <div 
              key={notif.id} 
              className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold rounded-xl flex justify-between items-center animate-bounce"
            >
              <span>{notif.message}</span>
              <button 
                onClick={() => setAlertNotifications(alertNotifications.filter(n => n.id !== notif.id))}
                className="text-[10px] text-rose-300/80 hover:text-rose-300 underline"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab switching */}
      <div className="flex border-b border-border/40 text-xs font-semibold">
        {[
          { id: "chart", label: "Interactive Chart", icon: LineChart },
          { id: "options", label: "Option Chain", icon: Compass },
          { id: "greeks", label: "Option Greeks", icon: BookOpen },
          { id: "oi", label: "OI Analysis", icon: BarChart2 },
          { id: "futures", label: "Futures carry", icon: Activity },
          { id: "metrics", label: "Quantitative Analytics", icon: TrendingUp }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 border-b-2 transition-colors ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>


      {/* Main Tab Render Workspace */}
      <div className="flex-1 min-h-[360px] relative">
        
        {/* TAB 1: CHART & DRAWINGS */}
        {activeTab === "chart" && (
          <div className="flex gap-4 flex-col lg:flex-row h-full">
            {/* Drawings toolbar */}
            <div className="flex lg:flex-col gap-1.5 p-1.5 bg-secondary/20 border border-border/40 rounded-xl max-w-fit self-start lg:self-stretch">
              {[
                { id: "select", label: "Cursor", icon: MousePointer },
                { id: "trendline", label: "Trend Line", icon: Edit3 },
                { id: "horizontal", label: "Horizontal", icon: Edit3 },
                { id: "rectangle", label: "Rectangle Zone", icon: Layers },
                { id: "fibonacci", label: "Fibonacci", icon: Activity },
                { id: "text", label: "Text Note", icon: Info },
                { id: "arrow", label: "Arrow Marker", icon: ArrowRight }
              ].map(tool => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    onClick={() => {
                      setActiveDrawingTool(tool.id === "select" ? null : tool.id);
                      setDrawingPoints([]);
                    }}
                    className={`p-2 rounded-lg transition-colors flex items-center justify-center ${activeDrawingTool === tool.id || (tool.id === "select" && !activeDrawingTool) ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}
                    title={tool.label}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
              {drawings.length > 0 && (
                <button
                  onClick={clearDrawings}
                  className="p-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center justify-center mt-auto"
                  title="Clear Drawings"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Main ECharts viewport */}
            <div className="flex-1 relative bg-secondary/10 border border-border/40 rounded-2xl overflow-hidden min-h-[350px]">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground bg-background/50">
                  Loading interactive chart...
                </div>
              ) : processedCandles.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground bg-background/50">
                  No chart data available.
                </div>
              ) : (
                <div className="h-full min-h-[350px]">
                  <ReactECharts
                    ref={chartRef}
                    option={getEChartOptions()}
                    style={{ height: "100%", minHeight: "350px" }}
                    onEvents={{
                      click: handleChartClick,
                      clickSeries: onSignalClick,
                      datazoom: handleDataZoom
                    }}
                  />
                  
                  {/* Drawing Instructions Overlay */}
                  {activeDrawingTool && (
                    <div className="absolute top-2 left-2 px-3 py-1 bg-primary/20 border border-primary/30 text-[10px] font-semibold text-primary rounded-lg animate-pulse pointer-events-none">
                      Drawing active: {activeDrawingTool}. Click on the chart to plot points.
                    </div>
                  )}

                  {/* Dynamic Support/Resistance labels */}
                  <div className="absolute bottom-6 left-4 flex gap-3 text-[10px]">
                    {indicatorData.marketStructure && (
                      <span className="bg-secondary/70 border border-border/50 text-foreground px-2 py-0.5 rounded font-medium">
                        Market: {indicatorData.marketStructure.trend}
                      </span>
                    )}
                    {activeS1 && (
                      <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-semibold">
                        S1: {formatCurrency(activeS1)}
                      </span>
                    )}
                    {activeR1 && (
                      <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-mono font-semibold">
                        R1: {formatCurrency(activeR1)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: OPTION CHAIN */}
        {activeTab === "options" && (
          <div className="flex flex-col gap-4 text-xs">
            {/* Filter chain panel */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="Search strikes..." 
                  value={fnoSearch}
                  onChange={(e) => setFnoSearch(e.target.value)}
                  className="bg-secondary/40 border border-border/60 rounded px-2.5 py-1 outline-none text-foreground text-xs"
                />
                <div className="flex gap-0.5 bg-secondary/50 rounded-lg p-0.5">
                  {["all", "itm", "otm"].map(f => (
                    <button
                      key={f}
                      onClick={() => setFnoFilter(f)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${fnoFilter === f ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground">
                Expiry: Nearest Thursday &middot; Spot: {formatCurrency(fnoData?.spot_price)}
              </span>
            </div>

            {/* Option chain table comparing Calls vs Puts side-by-side */}
            <div className="overflow-x-auto border border-border/40 rounded-xl">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border/40 text-[10px] text-muted-foreground font-bold tracking-wider uppercase">
                    <th className="px-3 py-2 text-center" colSpan={4}>CALLS (CE)</th>
                    <th className="px-3 py-2 text-center bg-secondary/60">STRIKE</th>
                    <th className="px-3 py-2 text-center" colSpan={4}>PUTS (PE)</th>
                  </tr>
                  <tr className="bg-secondary/20 border-b border-border/40 text-[10px] text-muted-foreground">
                    <th className="px-3 py-2 font-semibold">OI</th>
                    <th className="px-3 py-2 font-semibold">Volume</th>
                    <th className="px-3 py-2 font-semibold">IV</th>
                    <th className="px-3 py-2 font-semibold text-right">LTP (Chg)</th>
                    <th className="px-3 py-2 text-center bg-secondary/60 font-bold">Price</th>
                    <th className="px-3 py-2 font-semibold">LTP (Chg)</th>
                    <th className="px-3 py-2 font-semibold">IV</th>
                    <th className="px-3 py-2 font-semibold">Volume</th>
                    <th className="px-3 py-2 font-semibold">OI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/25 font-mono">
                  {fnoLoading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Loading option chain...</td>
                    </tr>
                  ) : filteredStrikes.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No option chain matches found.</td>
                    </tr>
                  ) : (
                    filteredStrikes.map(item => {
                      const strike = item.strike_price;
                      const call = item.call;
                      const put = item.put;
                      const spot = fnoData?.spot_price || 0;

                      // Shade In-The-Money (Calls < Spot, Puts > Spot)
                      const isCallITM = strike <= spot;
                      const isPutITM = strike >= spot;

                      return (
                        <tr key={strike} className="hover:bg-secondary/15">
                          {/* Call side */}
                          <td className={`px-3 py-1.5 ${isCallITM ? "bg-emerald-500/5 text-emerald-400/80" : ""}`}>
                            {formatNumber(call?.open_interest, { notation: "compact" })}
                          </td>
                          <td className={`px-3 py-1.5 ${isCallITM ? "bg-emerald-500/5 text-muted-foreground" : "text-muted-foreground"}`}>
                            {formatNumber(call?.volume, { notation: "compact" })}
                          </td>
                          <td className={`px-3 py-1.5 ${isCallITM ? "bg-emerald-500/5 text-muted-foreground" : "text-muted-foreground"}`}>
                            {call?.implied_volatility}%
                          </td>
                          <td className={`px-3 py-1.5 text-right ${isCallITM ? "bg-emerald-500/5 font-bold" : "font-semibold"}`}>
                            <span className="text-foreground">{formatNumber(call?.ltp)}</span>
                            <span className={`text-[10px] ml-1 ${call?.change >= 0 ? "text-[oklch(0.72_0.18_162)]" : "text-[oklch(0.60_0.22_25)]"}`}>
                              ({call?.percent_change}%)
                            </span>
                          </td>

                          {/* Strike Price */}
                          <td className="px-3 py-1.5 text-center bg-secondary/40 font-bold border-x border-border/40 text-foreground font-sans">
                            {formatNumber(strike)}
                          </td>

                          {/* Put side */}
                          <td className={`px-3 py-1.5 ${isPutITM ? "bg-rose-500/5 font-bold" : "font-semibold"}`}>
                            <span className="text-foreground">{formatNumber(put?.ltp)}</span>
                            <span className={`text-[10px] ml-1 ${put?.change >= 0 ? "text-[oklch(0.72_0.18_162)]" : "text-[oklch(0.60_0.22_25)]"}`}>
                              ({put?.percent_change}%)
                            </span>
                          </td>
                          <td className={`px-3 py-1.5 ${isPutITM ? "bg-rose-500/5 text-muted-foreground" : "text-muted-foreground"}`}>
                            {put?.implied_volatility}%
                          </td>
                          <td className={`px-3 py-1.5 ${isPutITM ? "bg-rose-500/5 text-muted-foreground" : "text-muted-foreground"}`}>
                            {formatNumber(put?.volume, { notation: "compact" })}
                          </td>
                          <td className={`px-3 py-1.5 ${isPutITM ? "bg-rose-500/5 text-rose-400/80" : ""}`}>
                            {formatNumber(put?.open_interest, { notation: "compact" })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: OPTION GREEKS */}
        {activeTab === "greeks" && (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 text-xs">
            {/* Interactive Greeks grid table */}
            <div className="xl:col-span-3 overflow-x-auto border border-border/40 rounded-xl">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border/40 text-[10px] text-muted-foreground font-bold tracking-wider uppercase">
                    <th className="px-3 py-2 text-center" colSpan={4}>CALL GREEKS</th>
                    <th className="px-3 py-2 text-center bg-secondary/60">STRIKE</th>
                    <th className="px-3 py-2 text-center" colSpan={4}>PUT GREEKS</th>
                  </tr>
                  <tr className="bg-secondary/20 border-b border-border/40 text-[10px] text-muted-foreground">
                    <th className="px-3 py-2 font-semibold">Delta</th>
                    <th className="px-3 py-2 font-semibold">Gamma</th>
                    <th className="px-3 py-2 font-semibold">Theta</th>
                    <th className="px-3 py-2 font-semibold">Vega</th>
                    <th className="px-3 py-2 text-center bg-secondary/60 font-bold">Price</th>
                    <th className="px-3 py-2 font-semibold">Vega</th>
                    <th className="px-3 py-2 font-semibold">Theta</th>
                    <th className="px-3 py-2 font-semibold">Gamma</th>
                    <th className="px-3 py-2 font-semibold">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/25 font-mono">
                  {fnoLoading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Loading Option Greeks...</td>
                    </tr>
                  ) : (
                    filteredStrikes.map(item => (
                      <tr key={item.strike_price} className="hover:bg-secondary/15">
                        <td className="px-3 py-1.5">{item.call?.delta}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{item.call?.gamma}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{item.call?.theta}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{item.call?.vega}</td>
                        
                        <td className="px-3 py-1.5 text-center bg-secondary/40 font-bold border-x border-border/40 text-foreground font-sans">
                          {formatNumber(item.strike_price)}
                        </td>

                        <td className="px-3 py-1.5 text-muted-foreground">{item.put?.vega}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{item.put?.theta}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{item.put?.gamma}</td>
                        <td className="px-3 py-1.5">{item.put?.delta}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* AI Greeks Explanation Guide drawer */}
            <div className="xl:col-span-1 p-4 rounded-xl border border-border/40 bg-secondary/20 flex flex-col gap-3">
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-primary" /> AI Greeks Guide
              </div>
              <div className="flex flex-col gap-2">
                {[
                  { name: "Delta (Δ)", role: "Direction", text: "Measures contract price sensitivity to a 1 rupee move in the spot price. CE ranges 0 to 1, PE ranges -1 to 0." },
                  { name: "Gamma (Γ)", role: "Delta Speed", text: "Acceleration rate of Delta. Highest at ATM strikes, measuring likelihood of option going ITM." },
                  { name: "Theta (θ)", role: "Time Decay", text: "Represents value erosion per day. Accelerates rapidly in the final 10 days before expiry." },
                  { name: "Vega (ν)", role: "Volatility", text: "Price reaction to 1% change in Implied Volatility (IV). High Vega indicates high premium swings." }
                ].map(greek => (
                  <button 
                    key={greek.name}
                    onClick={() => setGreeksExplanation(greek)}
                    className="text-left p-2.5 rounded-lg border border-border/30 hover:border-primary/40 bg-background/50 transition-colors flex flex-col"
                  >
                    <span className="font-bold text-foreground text-xs flex justify-between">
                      {greek.name} <span className="text-[10px] text-primary/80 uppercase font-semibold">{greek.role}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{greek.text}</span>
                  </button>
                ))}
              </div>

              {greeksExplanation && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-[10px] animate-in fade-in zoom-in-95 duration-150">
                  <div className="font-bold text-primary mb-1">{greeksExplanation.name} Explanation</div>
                  <p className="text-muted-foreground leading-relaxed">{greeksExplanation.text}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: OI ANALYSIS */}
        {activeTab === "oi" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 text-xs">
            {/* Call vs Put Open Interest charts */}
            <div className="lg:col-span-2 flex flex-col gap-4 border border-border/40 rounded-xl p-4 bg-secondary/15">
              <div className="font-bold text-foreground">Call vs Put Open Interest Concentration</div>
              <div className="flex flex-col gap-3 font-mono">
                {fnoLoading ? (
                  <div className="text-center py-10 text-muted-foreground">Loading OI data...</div>
                ) : (
                  filteredStrikes.slice(2, -2).map(item => {
                    const callOI = item.call?.open_interest || 0;
                    const putOI = item.put?.open_interest || 0;
                    const maxOI = Math.max(...fnoData.option_chain.flatMap(s => [s.call?.open_interest || 0, s.put?.open_interest || 0])) || 1;

                    return (
                      <div key={item.strike_price} className="grid grid-cols-12 items-center gap-2">
                        {/* Call OI bar (left-aligned) */}
                        <div className="col-span-5 flex justify-end items-center">
                          <span className="text-[10px] text-muted-foreground mr-1.5">{formatNumber(callOI, { notation: "compact" })}</span>
                          <div className="h-4 bg-rose-500/25 rounded-l self-center max-w-[80%]" style={{ width: `${(callOI / maxOI) * 100}%` }} />
                        </div>
                        {/* Strike price */}
                        <div className="col-span-2 text-center font-sans font-bold text-foreground bg-secondary/50 py-0.5 rounded">
                          {formatNumber(item.strike_price)}
                        </div>
                        {/* Put OI bar (right-aligned) */}
                        <div className="col-span-5 flex justify-start items-center">
                          <div className="h-4 bg-emerald-500/25 rounded-r self-center max-w-[80%]" style={{ width: `${(putOI / maxOI) * 100}%` }} />
                          <span className="text-[10px] text-muted-foreground ml-1.5">{formatNumber(putOI, { notation: "compact" })}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* AI OI build-up and market structure summary */}
            <div className="lg:col-span-1 flex flex-col gap-4">
              <div className="border border-border/40 rounded-xl p-4 bg-secondary/15 flex flex-col gap-3">
                <div className="font-bold text-foreground">AI Options Interpretation</div>
                {fnoLoading ? (
                  <div className="text-muted-foreground">Loading calculations...</div>
                ) : fnoData?.oi_analysis ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center pb-2 border-b border-border/30">
                      <span className="text-muted-foreground">Build-up state</span>
                      <span className="font-bold text-primary">{fnoData.oi_analysis.build_up_type}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-border/30">
                      <span className="text-muted-foreground">Put-Call Ratio (PCR)</span>
                      <span className={`font-mono font-bold ${fnoData.oi_analysis.pcr_ratio >= 1.0 ? "text-[oklch(0.72_0.18_162)]" : "text-[oklch(0.60_0.22_25)]"}`}>
                        {fnoData.oi_analysis.pcr_ratio}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground font-semibold">OI Sentiment:</span>
                      <p className="text-muted-foreground leading-relaxed italic bg-background/40 p-2.5 rounded-lg border border-border/20 mt-1">
                        "{fnoData.oi_analysis.interpretation}"
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground">No OI analysis available.</div>
                )}
              </div>

              {/* Horizontal Volume Profile distribution */}
              <div className="border border-border/40 rounded-xl p-4 bg-secondary/15 flex flex-col gap-2">
                <div className="font-bold text-foreground">Price Volume Profile (Horizontal)</div>
                <div className="flex flex-col gap-2 mt-2">
                  {volumeProfileBins.map((bin, i) => {
                    const maxBinVol = Math.max(...volumeProfileBins.map(b => b.volume)) || 1;
                    return (
                      <div key={i} className="flex items-center justify-between gap-2 font-mono">
                        <span className="text-[10px] text-muted-foreground min-w-[70px]">
                          {formatNumber(bin.priceStart)}-{formatNumber(bin.priceEnd)}
                        </span>
                        <div className="flex-1 h-2.5 bg-primary/10 rounded overflow-hidden">
                          <div className="h-full bg-primary/45 rounded" style={{ width: `${(bin.volume / maxBinVol) * 100}%` }} />
                        </div>
                        <span className="text-[9px] text-muted-foreground w-10 text-right">
                          {formatNumber(bin.volume, { notation: "compact" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: FUTURES DASHBOARD */}
        {activeTab === "futures" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* Futures metrics block */}
            <div className="border border-border/40 rounded-xl p-5 bg-secondary/15 flex flex-col gap-3">
              <div className="font-bold text-foreground text-sm">Futures Pricing & Cost of Carry</div>
              {fnoLoading ? (
                <div className="text-muted-foreground">Loading Futures details...</div>
              ) : fnoData?.futures ? (
                <div className="flex flex-col gap-3.5 mt-2">
                  <div className="grid grid-cols-2 gap-3 font-mono border-b border-border/30 pb-3">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Spot Price</div>
                      <div className="text-sm font-bold text-foreground">{formatCurrency(fnoData.futures.spot_price)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Futures LTP</div>
                      <div className="text-sm font-bold text-primary">{formatCurrency(fnoData.futures.futures_price)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 font-mono">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Basis Premium</div>
                      <div className="text-xs font-bold text-foreground">
                        {fnoData.futures.basis >= 0 ? "+" : ""}{fnoData.futures.basis}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Cost of Carry</div>
                      <div className="text-xs font-bold text-foreground">
                        {fnoData.futures.cost_of_carry_percent}% (Ann.)
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Futures Volume</div>
                      <div className="text-xs font-bold text-foreground">
                        {formatNumber(fnoData.futures.volume, { notation: "compact" })}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 font-mono pt-3 border-t border-border/30">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Futures OI</div>
                      <div className="text-xs font-bold text-foreground">
                        {formatNumber(fnoData.futures.open_interest, { notation: "compact" })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">OI Change</div>
                      <div className={`text-xs font-bold ${fnoData.futures.oi_change >= 0 ? "text-[oklch(0.72_0.18_162)]" : "text-[oklch(0.60_0.22_25)]"}`}>
                        {fnoData.futures.oi_change >= 0 ? "+" : ""}{formatNumber(fnoData.futures.oi_change)} ({fnoData.futures.oi_change_percent}%)
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">Futures snapshot unavailable.</div>
              )}
            </div>

            {/* AI Interpretation block */}
            <div className="border border-border/40 rounded-xl p-5 bg-secondary/15 flex flex-col gap-3">
              <div className="font-bold text-foreground text-sm">AI Futures Interpretation</div>
              {fnoLoading ? (
                <div className="text-muted-foreground">Loading calculations...</div>
              ) : fnoData?.futures ? (
                <div className="flex flex-col gap-4 mt-2">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Basis Setup:</span>
                    <p className="text-muted-foreground bg-background/40 p-3 rounded-lg border border-border/20 leading-relaxed font-sans">
                      {fnoData.futures.basis >= 0 
                        ? `Futures trading at a premium of ${fnoData.futures.basis.toFixed(2)} to spot, showing normal contango setup typical of bullish bias.`
                        : `Futures trading at backwardation discount of ${Math.abs(fnoData.futures.basis).toFixed(2)} to spot, suggesting short hedging dominance.`
                      }
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Interpretation Trend:</span>
                    <p className="text-muted-foreground bg-background/40 p-3 rounded-lg border border-border/20 leading-relaxed font-sans italic">
                      "{fnoData.futures.interpretation}"
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">No analysis available.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: QUANTITATIVE ANALYTICS */}
        {activeTab === "metrics" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in duration-200 mt-2">
            {/* Column 1: Core Risk-Adjusted Metrics */}
            <div className="border border-border/40 rounded-xl p-5 bg-secondary/15 flex flex-col gap-4">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-1.5 border-b border-border/30 pb-2">
                <ShieldAlert className="w-4 h-4 text-primary" /> Risk-Adjusted Return
              </h3>
              {analyticsLoading ? (
                <div className="text-muted-foreground text-xs">Loading analytics...</div>
              ) : analyticsData ? (
                <div className="flex flex-col gap-3 font-mono text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-border/25">
                    <span className="text-muted-foreground">Sharpe Ratio</span>
                    <span className={`font-bold ${analyticsData.sharpe_ratio >= 1.0 ? "text-[oklch(0.72_0.18_162)]" : "text-muted-foreground"}`}>{analyticsData.sharpe_ratio}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-border/25">
                    <span className="text-muted-foreground">Sortino Ratio</span>
                    <span className={`font-bold ${analyticsData.sortino_ratio >= 1.2 ? "text-[oklch(0.72_0.18_162)]" : "text-muted-foreground"}`}>{analyticsData.sortino_ratio}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-border/25">
                    <span className="text-muted-foreground">Annualized Volatility</span>
                    <span className="font-bold text-foreground">{(analyticsData.volatility * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Max Drawdown</span>
                    <span className="font-bold text-[oklch(0.60_0.22_25)]">{(analyticsData.max_drawdown * 100).toFixed(2)}%</span>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground text-xs">Analytics unavailable.</div>
              )}
            </div>

            {/* Column 2: Benchmark Relative Metrics */}
            <div className="border border-border/40 rounded-xl p-5 bg-secondary/15 flex flex-col gap-4">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-1.5 border-b border-border/30 pb-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Benchmark (NIFTY 50)
              </h3>
              {analyticsLoading ? (
                <div className="text-muted-foreground text-xs">Loading analytics...</div>
              ) : analyticsData ? (
                <div className="flex flex-col gap-3 font-mono text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-border/25">
                    <span className="text-muted-foreground">Beta (Market Sensitivity)</span>
                    <span className="font-bold text-foreground">{analyticsData.beta}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-border/25">
                    <span className="text-muted-foreground">Alpha (Excess Return)</span>
                    <span className={`font-bold ${analyticsData.alpha >= 0 ? "text-[oklch(0.72_0.18_162)]" : "text-[oklch(0.60_0.22_25)]"}`}>{(analyticsData.alpha * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Correlation Coefficient</span>
                    <span className="font-bold text-foreground">{analyticsData.correlation}</span>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground text-xs">Analytics unavailable.</div>
              )}
            </div>

            {/* Column 3: Rolling Returns */}
            <div className="border border-border/40 rounded-xl p-5 bg-secondary/15 flex flex-col gap-4">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-1.5 border-b border-border/30 pb-2">
                <Activity className="w-4 h-4 text-primary" /> Rolling Returns (Absolute)
              </h3>
              {analyticsLoading ? (
                <div className="text-muted-foreground text-xs">Loading analytics...</div>
              ) : analyticsData?.rolling_returns ? (
                <div className="flex flex-col gap-3 font-mono text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-border/25">
                    <span className="text-muted-foreground">7-Day Return</span>
                    <span className={`font-bold ${analyticsData.rolling_returns["7d"] >= 0 ? "text-[oklch(0.72_0.18_162)]" : "text-[oklch(0.60_0.22_25)]"}`}>
                      {analyticsData.rolling_returns["7d"] >= 0 ? "+" : ""}{analyticsData.rolling_returns["7d"]}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-border/25">
                    <span className="text-muted-foreground">30-Day Return</span>
                    <span className={`font-bold ${analyticsData.rolling_returns["30d"] >= 0 ? "text-[oklch(0.72_0.18_162)]" : "text-[oklch(0.60_0.22_25)]"}`}>
                      {analyticsData.rolling_returns["30d"] >= 0 ? "+" : ""}{analyticsData.rolling_returns["30d"]}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">90-Day Return</span>
                    <span className={`font-bold ${analyticsData.rolling_returns["90d"] >= 0 ? "text-[oklch(0.72_0.18_162)]" : "text-[oklch(0.60_0.22_25)]"}`}>
                      {analyticsData.rolling_returns["90d"] >= 0 ? "+" : ""}{analyticsData.rolling_returns["90d"]}%
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground text-xs">Analytics unavailable.</div>
              )}
            </div>
          </div>
        )}
      </div>


      {/* Pop up Overlay Modal for AI Signals details */}
      {selectedSignal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${(selectedSignal.type || "").includes("BUY") ? "bg-[oklch(0.72_0.18_162)]" : "bg-[oklch(0.60_0.22_25)]"}`} />
                <span className="font-bold text-foreground text-sm uppercase">AI Signal Details: {selectedSignal.type || "N/A"}</span>
              </div>
              <button 
                onClick={() => setSelectedSignal(null)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                Close
              </button>
            </div>
            <div className="flex flex-col gap-3 mt-4 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Confidence Score</span>
                <span className="font-mono font-bold text-primary">{selectedSignal.score}%</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground font-semibold">Trigger Reasoning:</span>
                <p className="text-muted-foreground bg-secondary/40 p-2.5 rounded-lg border border-border/25 mt-1 font-sans">
                  {selectedSignal.reason}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground font-semibold">Indicator Summary Snapshot:</span>
                <p className="text-muted-foreground bg-secondary/40 p-2.5 rounded-lg border border-border/25 mt-1 font-mono text-[10px]">
                  {selectedSignal.technicals}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
