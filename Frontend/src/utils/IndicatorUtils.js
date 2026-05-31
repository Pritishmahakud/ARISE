/**
 * Technical Indicators and Analysis Engine for React / Vite
 * Calculates financial indicators and pivot levels directly on candle datasets.
 */

// 1. Simple Moving Average (SMA)
export function calculateSMA(data, period = 14, key = "close") {
  const result = new Array(data.length).fill(null);
  if (data.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i][key];
  }
  result[period - 1] = sum / period;

  for (let i = period; i < data.length; i++) {
    sum += data[i][key] - data[i - period][key];
    result[i] = sum / period;
  }
  return result;
}

// 2. Exponential Moving Average (EMA)
export function calculateEMA(data, period = 14, key = "close") {
  const result = new Array(data.length).fill(null);
  if (data.length < period) return result;

  const k = 2 / (period + 1);
  let ema = calculateSMA(data, period, key)[period - 1];
  result[period - 1] = ema;

  for (let i = period; i < data.length; i++) {
    ema = data[i][key] * k + ema * (1 - k);
    result[i] = ema;
  }
  return result;
}

// Helper to calculate EMA on raw array
function calculateEMAOnArray(arr, period = 14) {
  const result = new Array(arr.length).fill(null);
  const firstValid = arr.findIndex(v => v !== null);
  if (firstValid === -1 || arr.length - firstValid < period) return result;

  const startIdx = firstValid + period - 1;
  let sum = 0;
  for (let i = firstValid; i <= startIdx; i++) {
    sum += arr[i];
  }
  let ema = sum / period;
  result[startIdx] = ema;

  const k = 2 / (period + 1);
  for (let i = startIdx + 1; i < arr.length; i++) {
    if (arr[i] === null) continue;
    ema = arr[i] * k + ema * (1 - k);
    result[i] = ema;
  }
  return result;
}

// 3. Double Exponential Moving Average (DEMA)
// Formula: 2 * EMA(C, n) - EMA(EMA(C, n), n)
export function calculateDEMA(data, period = 14, key = "close") {
  const result = new Array(data.length).fill(null);
  if (data.length < period) return result;

  const ema1 = calculateEMA(data, period, key);
  const ema2 = calculateEMAOnArray(ema1, period);

  for (let i = 0; i < data.length; i++) {
    if (ema1[i] !== null && ema2[i] !== null) {
      result[i] = 2 * ema1[i] - ema2[i];
    }
  }
  return result;
}

// 4. Triple Exponential Moving Average (TEMA)
// Formula: 3 * EMA - 3 * EMA(EMA) + EMA(EMA(EMA))
export function calculateTEMA(data, period = 14, key = "close") {
  const result = new Array(data.length).fill(null);
  if (data.length < period) return result;

  const ema1 = calculateEMA(data, period, key);
  const ema2 = calculateEMAOnArray(ema1, period);
  const ema3 = calculateEMAOnArray(ema2, period);

  for (let i = 0; i < data.length; i++) {
    if (ema1[i] !== null && ema2[i] !== null && ema3[i] !== null) {
      result[i] = 3 * ema1[i] - 3 * ema2[i] + ema3[i];
    }
  }
  return result;
}

// 5. Weighted Moving Average (WMA)
export function calculateWMA(data, period = 14, key = "close") {
  const result = new Array(data.length).fill(null);
  if (data.length < period) return result;

  const weightSum = (period * (period + 1)) / 2;

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      const weight = period - j;
      sum += data[i - j][key] * weight;
    }
    result[i] = sum / weightSum;
  }
  return result;
}

// 6. Volume Weighted Average Price (VWAP)
// Formula: Sum(Typical Price * Volume) / Sum(Volume)
export function calculateVWAP(data) {
  const result = new Array(data.length).fill(null);
  if (data.length === 0) return result;

  let cumVolume = 0;
  let cumTPVol = 0;

  for (let i = 0; i < data.length; i++) {
    const tp = (data[i].high + data[i].low + data[i].close) / 3;
    const vol = data[i].volume;
    cumVolume += vol;
    cumTPVol += tp * vol;
    result[i] = cumVolume > 0 ? cumTPVol / cumVolume : tp;
  }
  return result;
}

// 7. Average True Range (ATR)
export function calculateATR(data, period = 14) {
  const atr = new Array(data.length).fill(null);
  if (data.length < 2) return atr;

  const tr = new Array(data.length).fill(0);
  tr[0] = data[0].high - data[0].low;

  for (let i = 1; i < data.length; i++) {
    const hl = data[i].high - data[i].low;
    const hc = Math.abs(data[i].high - data[i - 1].close);
    const lc = Math.abs(data[i].low - data[i - 1].close);
    tr[i] = Math.max(hl, hc, lc);
  }

  // First ATR is simple average of TRs
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += tr[i];
  }
  atr[period - 1] = sum / period;

  // Smoothing
  for (let i = period; i < data.length; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }
  return atr;
}

// 8. Supertrend
// Formula: Basic Bands = (High+Low)/2 +/- Multiplier*ATR. True Bands adjusted based on previous Close.
export function calculateSupertrend(data, period = 10, multiplier = 3) {
  const result = new Array(data.length).fill(null);
  if (data.length < period) return result;

  const atr = calculateATR(data, period);
  
  const supertrend = new Array(data.length).fill(0);
  const direction = new Array(data.length).fill(1); // 1 = bullish, -1 = bearish

  const mid = new Array(data.length).fill(0);
  const basicUpper = new Array(data.length).fill(0);
  const basicLower = new Array(data.length).fill(0);
  const finalUpper = new Array(data.length).fill(0);
  const finalLower = new Array(data.length).fill(0);

  for (let i = 0; i < data.length; i++) {
    mid[i] = (data[i].high + data[i].low) / 2;
    if (i < period - 1) continue;

    basicUpper[i] = mid[i] + multiplier * atr[i];
    basicLower[i] = mid[i] - multiplier * atr[i];

    if (i === period - 1) {
      finalUpper[i] = basicUpper[i];
      finalLower[i] = basicLower[i];
      supertrend[i] = finalUpper[i];
      direction[i] = 1;
      continue;
    }

    // Final Upper Band
    if (basicUpper[i] < finalUpper[i - 1] || data[i - 1].close > finalUpper[i - 1]) {
      finalUpper[i] = basicUpper[i];
    } else {
      finalUpper[i] = finalUpper[i - 1];
    }

    // Final Lower Band
    if (basicLower[i] > finalLower[i - 1] || data[i - 1].close < finalLower[i - 1]) {
      finalLower[i] = basicLower[i];
    } else {
      finalLower[i] = finalLower[i - 1];
    }

    // Direction and Supertrend Value
    if (supertrend[i - 1] === finalUpper[i - 1]) {
      direction[i] = data[i].close > finalUpper[i] ? 1 : -1;
    } else {
      direction[i] = data[i].close < finalLower[i] ? -1 : 1;
    }

    supertrend[i] = direction[i] === 1 ? finalLower[i] : finalUpper[i];
    result[i] = {
      value: supertrend[i],
      direction: direction[i]
    };
  }
  return result;
}

// 9. Ichimoku Cloud
export function calculateIchimoku(data) {
  const result = new Array(data.length).fill(null);
  if (data.length < 52) return result;

  const getHighLowAvg = (arr, start, len) => {
    let high = -Infinity;
    let low = Infinity;
    for (let i = start - len + 1; i <= start; i++) {
      if (arr[i].high > high) high = arr[i].high;
      if (arr[i].low < low) low = arr[i].low;
    }
    return (high + low) / 2;
  };

  for (let i = 51; i < data.length; i++) {
    const conversionLine = getHighLowAvg(data, i, 9); // Tenkan-sen
    const baseLine = getHighLowAvg(data, i, 26);       // Kijun-sen
    
    // Senkou Span A (leading span A) is average of Tenkan and Kijun, plotted 26 periods ahead
    const leadingSpanA = (conversionLine + baseLine) / 2;
    // Senkou Span B (leading span B) is 52-period high/low average, plotted 26 periods ahead
    const leadingSpanB = getHighLowAvg(data, i, 52);

    result[i] = {
      conversionLine,
      baseLine,
      spanA: leadingSpanA,
      spanB: leadingSpanB,
      // Chikou Span is Close shifted back 26 periods
      laggingSpan: i >= 26 ? data[i - 26].close : null
    };
  }
  return result;
}

// 10. Parabolic SAR
export function calculateParabolicSAR(data, step = 0.02, maxStep = 0.2) {
  const sar = new Array(data.length).fill(null);
  if (data.length < 3) return sar;

  let isLong = data[1].close > data[0].close;
  let ep = isLong ? Math.max(data[0].high, data[1].high) : Math.min(data[0].low, data[1].low);
  let af = step;
  let curSar = isLong ? Math.min(data[0].low, data[1].low) : Math.max(data[0].high, data[1].high);

  sar[0] = curSar;
  sar[1] = curSar;

  for (let i = 2; i < data.length; i++) {
    const prevSar = curSar;
    if (isLong) {
      curSar = prevSar + af * (ep - prevSar);
      curSar = Math.min(curSar, data[i - 1].low, data[i - 2].low);
      
      if (data[i].low < curSar) {
        // Reverse to short
        isLong = false;
        curSar = ep;
        ep = data[i].low;
        af = step;
      } else {
        if (data[i].high > ep) {
          ep = data[i].high;
          af = Math.min(af + step, maxStep);
        }
      }
    } else {
      curSar = prevSar + af * (ep - prevSar);
      curSar = Math.max(curSar, data[i - 1].high, data[i - 2].high);

      if (data[i].high > curSar) {
        // Reverse to long
        isLong = true;
        curSar = ep;
        ep = data[i].high;
        af = step;
      } else {
        if (data[i].low < ep) {
          ep = data[i].low;
          af = Math.min(af + step, maxStep);
        }
      }
    }
    sar[i] = curSar;
  }
  return sar;
}

// 11. Relative Strength Index (RSI)
export function calculateRSI(data, period = 14) {
  const rsi = new Array(data.length).fill(50);
  if (data.length <= period) return rsi;

  let avgGain = 0;
  let avgLoss = 0;

  // First change
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) {
      avgGain += change;
    } else {
      avgLoss += Math.abs(change);
    }
  }

  avgGain /= period;
  avgLoss /= period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return rsi;
}

// 12. MACD
export function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const result = new Array(data.length).fill(null);
  if (data.length < slowPeriod) return result;

  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);

  const macdLine = new Array(data.length).fill(null);
  for (let i = 0; i < data.length; i++) {
    if (fastEMA[i] !== null && slowEMA[i] !== null) {
      macdLine[i] = fastEMA[i] - slowEMA[i];
    }
  }

  const signalLine = calculateEMAOnArray(macdLine, signalPeriod);

  for (let i = 0; i < data.length; i++) {
    if (macdLine[i] !== null && signalLine[i] !== null) {
      result[i] = {
        macd: macdLine[i],
        signal: signalLine[i],
        histogram: macdLine[i] - signalLine[i],
      };
    }
  }
  return result;
}

// 13. Stochastic RSI
export function calculateStochasticRSI(data, period = 14, kPeriod = 3, dPeriod = 3) {
  const result = new Array(data.length).fill(null);
  if (data.length < period + 10) return result;

  const rsi = calculateRSI(data, period);

  const stochRSI = new Array(data.length).fill(null);
  for (let i = period - 1; i < data.length; i++) {
    let minRsi = Infinity;
    let maxRsi = -Infinity;
    for (let j = 0; j < period; j++) {
      const val = rsi[i - j];
      if (val < minRsi) minRsi = val;
      if (val > maxRsi) maxRsi = val;
    }
    const denom = maxRsi - minRsi;
    stochRSI[i] = denom === 0 ? 50 : ((rsi[i] - minRsi) / denom) * 100;
  }

  // Smooth K
  const stochK = new Array(data.length).fill(null);
  for (let i = period + kPeriod - 2; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < kPeriod; j++) {
      sum += stochRSI[i - j] || 0;
    }
    stochK[i] = sum / kPeriod;
  }

  // Smooth D
  const stochD = new Array(data.length).fill(null);
  for (let i = period + kPeriod + dPeriod - 3; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < dPeriod; j++) {
      sum += stochK[i - j] || 0;
    }
    stochD[i] = sum / dPeriod;
  }

  for (let i = 0; i < data.length; i++) {
    if (stochK[i] !== null && stochD[i] !== null) {
      result[i] = { k: stochK[i], d: stochD[i] };
    }
  }
  return result;
}

// 14. Bollinger Bands
export function calculateBollingerBands(data, period = 20, multiplier = 2) {
  const result = new Array(data.length).fill(null);
  if (data.length < period) return result;

  const middle = calculateSMA(data, period);

  for (let i = period - 1; i < data.length; i++) {
    const avg = middle[i];
    let sumSq = 0;
    for (let j = 0; j < period; j++) {
      const dev = data[i - j].close - avg;
      sumSq += dev * dev;
    }
    const stdDev = Math.sqrt(sumSq / period);
    result[i] = {
      middle: avg,
      upper: avg + multiplier * stdDev,
      lower: avg - multiplier * stdDev,
    };
  }
  return result;
}

// 15. Keltner Channels
export function calculateKeltnerChannels(data, emaPeriod = 20, atrPeriod = 10, multiplier = 2) {
  const result = new Array(data.length).fill(null);
  if (data.length < Math.max(emaPeriod, atrPeriod)) return result;

  const ema = calculateEMA(data, emaPeriod);
  const atr = calculateATR(data, atrPeriod);

  for (let i = 0; i < data.length; i++) {
    if (ema[i] !== null && atr[i] !== null) {
      result[i] = {
        middle: ema[i],
        upper: ema[i] + multiplier * atr[i],
        lower: ema[i] - multiplier * atr[i]
      };
    }
  }
  return result;
}

// 16. On Balance Volume (OBV)
export function calculateOBV(data) {
  const obv = new Array(data.length).fill(0);
  if (data.length === 0) return obv;

  obv[0] = data[0].volume;
  for (let i = 1; i < data.length; i++) {
    if (data[i].close > data[i - 1].close) {
      obv[i] = obv[i - 1] + data[i].volume;
    } else if (data[i].close < data[i - 1].close) {
      obv[i] = obv[i - 1] - data[i].volume;
    } else {
      obv[i] = obv[i - 1];
    }
  }
  return obv;
}

// 17. Accumulation/Distribution
export function calculateAD(data) {
  const ad = new Array(data.length).fill(0);
  if (data.length === 0) return ad;

  let prevAD = 0;
  for (let i = 0; i < data.length; i++) {
    const range = data[i].high - data[i].low;
    // Money Flow Multiplier
    const mfm = range === 0 ? 0 : ((data[i].close - data[i].low) - (data[i].high - data[i].close)) / range;
    const mfv = mfm * data[i].volume;
    const curAD = prevAD + mfv;
    ad[i] = curAD;
    prevAD = curAD;
  }
  return ad;
}

// 18. Momentum and ROC
export function calculateMomentum(data, period = 10) {
  const result = new Array(data.length).fill(null);
  for (let i = period; i < data.length; i++) {
    result[i] = data[i].close - data[i - period].close;
  }
  return result;
}

export function calculateROC(data, period = 12) {
  const result = new Array(data.length).fill(null);
  for (let i = period; i < data.length; i++) {
    const prev = data[i - period].close;
    result[i] = prev === 0 ? 0 : ((data[i].close - prev) / prev) * 100;
  }
  return result;
}

// 19. Volume Profile (Horizontal volume breakdown)
export function calculateVolumeProfile(data, binsCount = 10) {
  if (data.length === 0) return [];
  const prices = data.map(d => d.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const binWidth = range / binsCount;

  const bins = Array.from({ length: binsCount }, (_, i) => ({
    priceStart: min + i * binWidth,
    priceEnd: min + (i + 1) * binWidth,
    volume: 0
  }));

  for (let i = 0; i < data.length; i++) {
    const p = data[i].close;
    const vol = data[i].volume;
    const binIdx = Math.min(binsCount - 1, Math.floor((p - min) / binWidth));
    if (binIdx >= 0) {
      bins[binIdx].volume += vol;
    }
  }
  return bins;
}

// 20. Pivot Points Levels (PP, S1-S3, R1-R3)
// Supported methods: Classic, Fibonacci, Camarilla, Woodie, Demark
export function calculatePivotPoints(data, method = "classic") {
  if (data.length < 2) return null;
  
  // Use the previous candle's High, Low, Close for intraday/swing pivots
  const prev = data[data.length - 2];
  const h = prev.high;
  const l = prev.low;
  const c = prev.close;
  const open = prev.open;

  let pp = 0, r1 = 0, r2 = 0, r3 = 0, s1 = 0, s2 = 0, s3 = 0;

  switch (method.toLowerCase()) {
    case "fibonacci":
      pp = (h + l + c) / 3;
      r1 = pp + (h - l) * 0.382;
      r2 = pp + (h - l) * 0.618;
      r3 = pp + (h - l) * 1.000;
      s1 = pp - (h - l) * 0.382;
      s2 = pp - (h - l) * 0.618;
      s3 = pp - (h - l) * 1.000;
      break;

    case "camarilla":
      pp = (h + l + c) / 3;
      r1 = c + (h - l) * 1.1 / 12;
      r2 = c + (h - l) * 1.1 / 6;
      r3 = c + (h - l) * 1.1 / 4;
      s1 = c - (h - l) * 1.1 / 12;
      s2 = c - (h - l) * 1.1 / 6;
      s3 = c - (h - l) * 1.1 / 4;
      break;

    case "woodie":
      // Uses current open price of the last candle
      const curOpen = data[data.length - 1].open;
      pp = (h + l + 2 * curOpen) / 4;
      r1 = 2 * pp - l;
      r2 = pp + (h - l);
      r3 = h + 2 * (pp - l);
      s1 = 2 * pp - h;
      s2 = pp - (h - l);
      s3 = l - 2 * (h - pp);
      break;

    case "demark":
      let x = 0;
      const curClose = data[data.length - 1].close;
      if (curClose < open) {
        x = h + 2 * l + c;
      } else if (curClose > open) {
        x = 2 * h + l + c;
      } else {
        x = h + l + 2 * c;
      }
      pp = x / 4;
      r1 = x / 2 - l;
      s1 = x / 2 - h;
      // Demark only calculates S1/R1, others are extrapolated or left blank
      r2 = pp + (h - l);
      s2 = pp - (h - l);
      r3 = r2 + (h - l);
      s3 = s2 - (h - l);
      break;

    case "classic":
    default:
      pp = (h + l + c) / 3;
      r1 = 2 * pp - l;
      r2 = pp + (h - l);
      r3 = h + 2 * (pp - l);
      s1 = 2 * pp - h;
      s2 = pp - (h - l);
      s3 = l - 2 * (h - pp);
      break;
  }

  return { pp, r1, r2, r3, s1, s2, s3 };
}

// 21. Swing Pivots Detection (HH, HL, LH, LL)
export function detectSwingPivots(data, leftBars = 4, rightBars = 4) {
  const result = new Array(data.length).fill(null);
  if (data.length < leftBars + rightBars + 1) return result;

  let lastHighPrice = null;
  let lastLowPrice = null;
  let lastHighType = null; // "HH" or "LH"
  let lastLowType = null;  // "HL" or "LL"

  for (let i = leftBars; i < data.length - rightBars; i++) {
    const cur = data[i];
    
    // Check Swing High
    let isHigh = true;
    for (let j = 1; j <= leftBars; j++) {
      if (data[i - j].high >= cur.high) isHigh = false;
    }
    for (let j = 1; j <= rightBars; j++) {
      if (data[i + j].high > cur.high) isHigh = false;
    }

    // Check Swing Low
    let isLow = true;
    for (let j = 1; j <= leftBars; j++) {
      if (data[i - j].low <= cur.low) isLow = false;
    }
    for (let j = 1; j <= rightBars; j++) {
      if (data[i + j].low < cur.low) isLow = false;
    }

    let marker = null;

    if (isHigh) {
      let type = "H";
      if (lastHighPrice !== null) {
        type = cur.high > lastHighPrice ? "HH" : "LH";
      }
      lastHighPrice = cur.high;
      lastHighType = type;
      marker = { type, value: cur.high, label: "▲" };
    } else if (isLow) {
      let type = "L";
      if (lastLowPrice !== null) {
        type = cur.low > lastLowPrice ? "HL" : "LL";
      }
      lastLowPrice = cur.low;
      lastLowType = type;
      marker = { type, value: cur.low, label: "▼" };
    }

    if (marker) {
      result[i] = marker;
    }
  }
  return result;
}

// 22. AI Market Structure Analyzer
// Classifies current structure as Uptrend, Downtrend, Sideways Range, Breakout, or Reversal
export function analyzeMarketStructure(data, swingPivots) {
  if (data.length === 0) return { trend: "Sideways Range", insight: "Insufficient data to establish trend structure." };

  const validMarkers = swingPivots
    .map((m, idx) => m ? { ...m, idx } : null)
    .filter(m => m !== null)
    .slice(-5); // Look at last 5 swing markers

  if (validMarkers.length < 3) {
    return {
      trend: "Sideways Range",
      insight: "Price action is consolidative with no clear trend structure established."
    };
  }

  // Count HH, HL, LH, LL
  const counts = { HH: 0, HL: 0, LH: 0, LL: 0 };
  validMarkers.forEach(m => {
    if (counts[m.type] !== undefined) counts[m.type]++;
  });

  const lastPrice = data[data.length - 1].close;

  // Check Uptrend
  if (counts.HH + counts.HL >= 3 || (counts.HH > 0 && counts.HL > 0 && counts.LH === 0 && counts.LL === 0)) {
    return {
      trend: "Uptrend",
      insight: `Forming consecutive Higher Highs and Higher Lows, indicating strong bullish market structure. Dynamic support pivots hold.`
    };
  }

  // Check Downtrend
  if (counts.LH + counts.LL >= 3 || (counts.LH > 0 && counts.LL > 0 && counts.HH === 0 && counts.HL === 0)) {
    return {
      trend: "Downtrend",
      insight: `Forming consecutive Lower Highs and Lower Lows, indicating strong bearish control. Rallies continue to get sold.`
    };
  }

  // Check Breakout
  const lastMarker = validMarkers[validMarkers.length - 1];
  if (lastMarker.type === "HH" && lastPrice > lastMarker.value) {
    return {
      trend: "Breakout",
      insight: `Price has breached the key swing resistance at ${lastMarker.value.toFixed(2)}, triggering momentum expansion.`
    };
  }

  // Reversal check
  if (counts.HH > 0 && counts.LL > 0) {
    return {
      trend: "Reversal",
      insight: `Mixed swing pivots (HH and LL) suggest trend exhaustion or potential trend reversal. Exercise caution.`
    };
  }

  return {
    trend: "Sideways Range",
    insight: `Swing pivots are alternating without crossing key extremes. Price is bound in a sideways range.`
  };
}
