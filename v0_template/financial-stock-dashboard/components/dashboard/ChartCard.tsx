"use client"

import { useState, useMemo } from "react"
import { BarChart2, LineChart } from "lucide-react"

// Seeded pseudo-random number generator for consistent SSR/client rendering
function seededRandom(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
}

// Generate plausible price series with a seed for deterministic output
function genSeries(base: number, seed: number, n = 60) {
  const rand = seededRandom(seed)
  let p = base
  return Array.from({ length: n }, (_, i) => {
    p += (rand() - 0.48) * base * 0.015
    const open = p
    const close = p + (rand() - 0.5) * base * 0.008
    const high = Math.max(open, close) + rand() * base * 0.005
    const low  = Math.min(open, close) - rand() * base * 0.005
    return { i, open, close, high, low, price: p }
  })
}

const BASE_PRICES: Record<string, number> = {
  RELIANCE: 2934, TCS: 4012, INFY: 1782, "HDFC BANK": 1654,
  "ICICI BANK": 1280, ZOMATO: 234, NYKAA: 194, PAYTM: 612,
  WIPRO: 480, BHARTIARTL: 1420,
}

const TIMEFRAMES = ["1D","1W","1M","3M","1Y"]
const TIMEFRAME_SEEDS: Record<string, number> = { "1D": 1, "1W": 2, "1M": 3, "3M": 4, "1Y": 5 }
const SUPPORTS = ["2,870","2,820","2,760"]
const RESISTANCES = ["2,980","3,040","3,120"]

interface Props { symbol: string }

export function ChartCard({ symbol }: Props) {
  const [mode, setMode] = useState<"line" | "candle">("line")
  const [tf, setTf] = useState("1M")

  const base = BASE_PRICES[symbol] ?? 1000
  // Create a deterministic seed from symbol + timeframe
  const seed = useMemo(() => {
    let hash = 0
    for (let i = 0; i < symbol.length; i++) {
      hash = ((hash << 5) - hash) + symbol.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash) + (TIMEFRAME_SEEDS[tf] ?? 1)
  }, [symbol, tf])
  
  const data = useMemo(() => genSeries(base, seed), [base, seed])

  const W = 560, H = 200
  const prices = data.map(d => d.price)
  const min = Math.min(...prices) * 0.998
  const max = Math.max(...prices) * 1.002
  const toY = (v: number) => H - ((v - min) / (max - min)) * H
  const toX = (i: number) => (i / (data.length - 1)) * W

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(d.price).toFixed(1)}`).join(" ")
  const areaPath = linePath + ` L ${W} ${H} L 0 ${H} Z`

  const up = data[data.length - 1].price > data[0].price

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-4 border border-border/60">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <LineChart className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">Price Chart</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Timeframe */}
          <div className="flex gap-0.5 bg-secondary/60 rounded-lg p-0.5">
            {TIMEFRAMES.map(t => (
              <button key={t} onClick={() => setTf(t)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${tf === t ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {t}
              </button>
            ))}
          </div>
          {/* Chart type */}
          <div className="flex gap-0.5 bg-secondary/60 rounded-lg p-0.5">
            <button onClick={() => setMode("line")}
              className={`p-1.5 rounded-md transition-colors ${mode === "line" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <LineChart className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setMode("candle")}
              className={`p-1.5 rounded-md transition-colors ${mode === "candle" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative rounded-xl overflow-hidden bg-secondary/20 border border-border/40">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-48" preserveAspectRatio="none">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={up ? "oklch(0.72 0.18 162)" : "oklch(0.60 0.22 25)"} stopOpacity="0.25" />
              <stop offset="100%" stopColor={up ? "oklch(0.72 0.18 162)" : "oklch(0.60 0.22 25)"} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map(f => (
            <line key={f} x1="0" y1={H * f} x2={W} y2={H * f}
              stroke="oklch(0.28 0.02 235)" strokeWidth="1" strokeDasharray="4 4" />
          ))}

          {mode === "line" ? (
            <>
              <path d={areaPath} fill="url(#areaGrad)" />
              <path d={linePath} fill="none"
                stroke={up ? "oklch(0.72 0.18 162)" : "oklch(0.60 0.22 25)"}
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </>
          ) : (
            data.map((d, i) => {
              const x = toX(i)
              const candleW = Math.max(W / data.length - 2, 3)
              const bodyTop = Math.min(toY(d.open), toY(d.close))
              const bodyH = Math.abs(toY(d.open) - toY(d.close)) || 1
              const bullish = d.close >= d.open
              const color = bullish ? "oklch(0.72 0.18 162)" : "oklch(0.60 0.22 25)"
              return (
                <g key={i}>
                  <line x1={x} y1={toY(d.high)} x2={x} y2={toY(d.low)} stroke={color} strokeWidth="1" />
                  <rect x={x - candleW / 2} y={bodyTop} width={candleW} height={bodyH}
                    fill={bullish ? color : "none"} stroke={color} strokeWidth="1" />
                </g>
              )
            })
          )}
        </svg>

        {/* Price labels */}
        <div className="absolute top-2 right-3 text-right">
          <div className="text-xs font-mono text-muted-foreground">{(min).toFixed(0)}</div>
        </div>
        <div className="absolute bottom-2 right-3 text-right">
          <div className="text-xs font-mono text-muted-foreground">{(max).toFixed(0)}</div>
        </div>
      </div>

      {/* Support / Resistance */}
      <div className="flex flex-wrap gap-3">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Support</div>
          <div className="flex gap-1.5 flex-wrap">
            {SUPPORTS.map(s => (
              <span key={s} className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[oklch(0.72_0.18_162_/_0.12)] border border-[oklch(0.72_0.18_162_/_0.35)] text-[oklch(0.72_0.18_162)]">
                ₹{s}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Resistance</div>
          <div className="flex gap-1.5 flex-wrap">
            {RESISTANCES.map(r => (
              <span key={r} className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[oklch(0.60_0.22_25_/_0.12)] border border-[oklch(0.60_0.22_25_/_0.35)] text-[oklch(0.60_0.22_25)]">
                ₹{r}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
