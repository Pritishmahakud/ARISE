"use client"

import { TrendingUp, TrendingDown } from "lucide-react"

const TICKERS = [
  { label: "NIFTY 50",    price: "24,832.65", change: "+1.14%", up: true },
  { label: "NIFTY BANK",  price: "53,412.20", change: "-0.38%", up: false },
  { label: "SENSEX",      price: "81,605.40", change: "+0.97%", up: true },
  { label: "NIFTY IT",    price: "38,220.75", change: "+2.31%", up: true },
  { label: "NIFTY METAL", price: "9,104.55",  change: "-1.22%", up: false },
  { label: "NIFTY AUTO",  price: "22,540.10", change: "+0.54%", up: true },
  { label: "NIFTY PHARMA",price: "21,890.30", change: "+1.07%", up: true },
  { label: "USD/INR",     price: "83.72",     change: "-0.04%", up: false },
  { label: "GOLD",        price: "₹72,450",   change: "+0.62%", up: true },
  { label: "CRUDE OIL",   price: "$76.34",    change: "-1.45%", up: false },
]

function TickerPill({ label, price, change, up }: (typeof TICKERS)[0]) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-card text-xs font-mono border shrink-0 mx-1.5"
      style={{ borderColor: up ? "oklch(0.72 0.18 162 / 0.35)" : "oklch(0.60 0.22 25 / 0.35)" }}>
      <span className="text-foreground/70 font-medium tracking-wide">{label}</span>
      <span className="text-foreground font-semibold">{price}</span>
      <span className={`flex items-center gap-0.5 font-bold ${up ? "text-[oklch(0.72_0.18_162)]" : "text-[oklch(0.60_0.22_25)]"}`}>
        {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {change}
      </span>
    </span>
  )
}

export function TickerMarquee() {
  const doubled = [...TICKERS, ...TICKERS]
  return (
    <div className="relative w-full overflow-hidden border-b border-border bg-card/60 backdrop-blur py-2">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 h-full w-16 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to right, oklch(0.10 0.015 240), transparent)" }} />
      <div className="absolute right-0 top-0 h-full w-16 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left, oklch(0.10 0.015 240), transparent)" }} />

      {/* Live badge */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 bg-background/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase border border-border">
        <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.72_0.18_162)] animate-pulse" />
        <span className="text-[oklch(0.72_0.18_162)]">LIVE</span>
      </div>

      <div className="flex animate-marquee pl-24">
        {doubled.map((t, i) => <TickerPill key={i} {...t} />)}
      </div>
    </div>
  )
}
