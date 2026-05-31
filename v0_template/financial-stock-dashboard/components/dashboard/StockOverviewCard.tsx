"use client"

import { TrendingUp, TrendingDown, Activity } from "lucide-react"

const STOCK_DATA: Record<string, {
  price: string; change: string; changePct: string; up: boolean;
  volume: string; dma20: string; dma50: string; dma200: string;
  rsi: number; pe: string; mcap: string; high52: string; low52: string;
}> = {
  RELIANCE:   { price: "2,934.55", change: "+35.10", changePct: "+1.21%", up: true,  volume: "12.4M", dma20: "2,898", dma50: "2,840", dma200: "2,720", rsi: 61.2, pe: "27.4x", mcap: "₹19.8L Cr", high52: "3,024", low52: "2,220" },
  TCS:        { price: "4,012.80", change: "+48.30", changePct: "+1.22%", up: true,  volume: "8.1M",  dma20: "3,975", dma50: "3,910", dma200: "3,780", rsi: 58.4, pe: "31.2x", mcap: "₹14.6L Cr", high52: "4,180", low52: "3,430" },
  INFY:       { price: "1,782.40", change: "-14.60", changePct: "-0.81%", up: false, volume: "9.3M",  dma20: "1,798", dma50: "1,760", dma200: "1,690", rsi: 47.8, pe: "28.6x", mcap: "₹7.4L Cr",  high52: "1,960", low52: "1,480" },
  "HDFC BANK":{ price: "1,654.25", change: "+22.15", changePct: "+1.36%", up: true,  volume: "14.2M", dma20: "1,634", dma50: "1,600", dma200: "1,548", rsi: 63.5, pe: "19.8x", mcap: "₹12.5L Cr", high52: "1,790", low52: "1,364" },
  "ICICI BANK":{ price: "1,280.60", change: "-8.40", changePct: "-0.65%", up: false, volume: "11.7M", dma20: "1,292", dma50: "1,270", dma200: "1,220", rsi: 51.2, pe: "18.4x", mcap: "₹9.0L Cr",  high52: "1,398", low52: "1,040" },
  ZOMATO:     { price: "234.75",   change: "+6.45",  changePct: "+2.83%", up: true,  volume: "22.5M", dma20: "228",   dma50: "218",   dma200: "195",   rsi: 68.9, pe: "N/A",   mcap: "₹2.1L Cr",  high52: "289",   low52: "147" },
  NYKAA:      { price: "194.20",   change: "-2.80",  changePct: "-1.42%", up: false, volume: "6.4M",  dma20: "198",   dma50: "202",   dma200: "210",   rsi: 43.1, pe: "N/A",   mcap: "₹55K Cr",   high52: "248",   low52: "155" },
  PAYTM:      { price: "612.50",   change: "+18.30", changePct: "+3.08%", up: true,  volume: "18.3M", dma20: "594",   dma50: "572",   dma200: "530",   rsi: 71.4, pe: "N/A",   mcap: "₹39K Cr",   high52: "702",   low52: "310" },
  WIPRO:      { price: "480.35",   change: "+3.95",  changePct: "+0.83%", up: true,  volume: "7.8M",  dma20: "476",   dma50: "468",   dma200: "450",   rsi: 54.6, pe: "22.1x", mcap: "₹2.5L Cr",  high52: "552",   low52: "395" },
  BHARTIARTL: { price: "1,420.80", change: "-11.20", changePct: "-0.78%", up: false, volume: "5.6M",  dma20: "1,432", dma50: "1,408", dma200: "1,360", rsi: 49.3, pe: "68.2x", mcap: "₹8.4L Cr",  high52: "1,620", low52: "1,140" },
}

const DEFAULT = STOCK_DATA["RELIANCE"]

interface Props { symbol: string }

export function StockOverviewCard({ symbol }: Props) {
  const d = STOCK_DATA[symbol] ?? DEFAULT
  const up = d.up

  const rsiColor = d.rsi > 70 ? "text-[oklch(0.60_0.22_25)]" : d.rsi < 30 ? "text-[oklch(0.60_0.22_25)]" : "text-[oklch(0.72_0.18_162)]"

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-4 glow-teal border border-primary/20">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Overview</span>
          </div>
          <div className="flex items-end gap-3 mt-1.5">
            <span className="text-2xl font-bold font-mono text-foreground">{symbol}</span>
            <span className="text-xs text-muted-foreground mb-0.5 truncate max-w-[120px]">NSE · Equity</span>
          </div>
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${up ? "bg-[oklch(0.72_0.18_162_/_0.12)] border-[oklch(0.72_0.18_162_/_0.4)] text-[oklch(0.72_0.18_162)]" : "bg-[oklch(0.60_0.22_25_/_0.12)] border-[oklch(0.60_0.22_25_/_0.4)] text-[oklch(0.60_0.22_25)]"}`}>
          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {up ? "BULL" : "BEAR"}
        </div>
      </div>

      {/* Price */}
      <div>
        <div className="text-4xl font-bold font-mono text-foreground tracking-tight">₹{d.price}</div>
        <div className={`flex items-center gap-1.5 mt-0.5 font-mono text-sm font-semibold ${up ? "text-[oklch(0.72_0.18_162)]" : "text-[oklch(0.60_0.22_25)]"}`}>
          {up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {d.change} ({d.changePct}) Today
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Volume",    value: d.volume },
          { label: "20 DMA",   value: `₹${d.dma20}` },
          { label: "50 DMA",   value: `₹${d.dma50}` },
          { label: "200 DMA",  value: `₹${d.dma200}` },
          { label: "RSI 14",   value: d.rsi.toFixed(1), custom: rsiColor },
          { label: "P/E Ratio",value: d.pe },
          { label: "Mkt Cap",  value: d.mcap },
          { label: "52W High", value: `₹${d.high52}` },
          { label: "52W Low",  value: `₹${d.low52}` },
        ].map(m => (
          <div key={m.label} className="bg-secondary/50 rounded-lg px-3 py-2 border border-border/60">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</div>
            <div className={`font-mono font-semibold text-sm mt-0.5 ${m.custom ?? "text-foreground"}`}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
