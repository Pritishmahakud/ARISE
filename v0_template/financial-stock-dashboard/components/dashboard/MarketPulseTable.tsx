"use client"

import { BarChart, TrendingUp, TrendingDown } from "lucide-react"

const WATCH = [
  { sym: "RELIANCE",    price: "2,934.55", chg: "+1.21%", up: true,  vol: "12.4M",  sector: "Energy" },
  { sym: "TCS",         price: "4,012.80", chg: "+1.22%", up: true,  vol: "8.1M",   sector: "IT" },
  { sym: "INFY",        price: "1,782.40", chg: "-0.81%", up: false, vol: "9.3M",   sector: "IT" },
  { sym: "HDFC BANK",   price: "1,654.25", chg: "+1.36%", up: true,  vol: "14.2M",  sector: "Banking" },
  { sym: "ICICI BANK",  price: "1,280.60", chg: "-0.65%", up: false, vol: "11.7M",  sector: "Banking" },
  { sym: "ZOMATO",      price: "234.75",   chg: "+2.83%", up: true,  vol: "22.5M",  sector: "Consumer" },
  { sym: "NYKAA",       price: "194.20",   chg: "-1.42%", up: false, vol: "6.4M",   sector: "Retail" },
  { sym: "PAYTM",       price: "612.50",   chg: "+3.08%", up: true,  vol: "18.3M",  sector: "Fintech" },
  { sym: "WIPRO",       price: "480.35",   chg: "+0.83%", up: true,  vol: "7.8M",   sector: "IT" },
  { sym: "BHARTIARTL",  price: "1,420.80", chg: "-0.78%", up: false, vol: "5.6M",   sector: "Telecom" },
  { sym: "BAJFINANCE",  price: "7,854.30", chg: "+2.14%", up: true,  vol: "4.2M",   sector: "NBFC" },
  { sym: "MARUTI",      price: "12,480.60",chg: "+0.54%", up: true,  vol: "2.1M",   sector: "Auto" },
]

interface Props { onSelectStock: (sym: string) => void; activeStock: string }

export function MarketPulseTable({ onSelectStock, activeStock }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">Market Pulse</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">Top Volume · NSE</span>
      </div>

      <div className="glass-card rounded-2xl border border-border/60 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-5 px-4 py-2 border-b border-border/60 bg-secondary/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Symbol</span>
          <span className="text-right">Price</span>
          <span className="text-right">Change</span>
          <span className="text-right">Volume</span>
          <span className="text-right hidden sm:block">Sector</span>
        </div>

        {/* Rows */}
        {WATCH.map((w, i) => (
          <button
            key={w.sym}
            onClick={() => onSelectStock(w.sym)}
            className={`grid grid-cols-5 w-full px-4 py-2.5 text-left border-b border-border/30 last:border-0 transition-colors hover:bg-secondary/40 ${
              activeStock === w.sym ? "bg-primary/10 border-l-2 border-l-primary" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs text-foreground truncate">{w.sym}</span>
            </div>
            <div className="text-right font-mono text-xs text-foreground">₹{w.price}</div>
            <div className={`text-right font-mono font-semibold text-xs flex items-center justify-end gap-0.5 ${w.up ? "text-[oklch(0.72_0.18_162)]" : "text-[oklch(0.60_0.22_25)]"}`}>
              {w.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {w.chg}
            </div>
            <div className="text-right font-mono text-xs text-muted-foreground">{w.vol}</div>
            <div className="text-right font-mono text-xs text-muted-foreground hidden sm:block">{w.sector}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
