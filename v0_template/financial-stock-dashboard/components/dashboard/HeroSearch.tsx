"use client"

import { useState } from "react"
import { Search, X, Zap } from "lucide-react"

const QUICK_PICKS = [
  "RELIANCE", "TCS", "INFY", "HDFC BANK", "ICICI BANK",
  "ZOMATO", "NYKAA", "PAYTM", "WIPRO", "BHARTIARTL"
]

const SUGGESTIONS = [
  { sym: "RELIANCE", name: "Reliance Industries Ltd", sector: "Energy", price: "2,934.55", change: "+1.2%" },
  { sym: "RITES",    name: "RITES Ltd",                sector: "Infra",  price: "324.40",   change: "-0.4%" },
  { sym: "RIVL",     name: "Reliance Infra",           sector: "Infra",  price: "184.10",   change: "+0.8%" },
]

interface Props {
  activeStock: string
  onSelectStock: (sym: string) => void
}

export function HeroSearch({ activeStock, onSelectStock }: Props) {
  const [query, setQuery] = useState("")
  const [focused, setFocused] = useState(false)

  const filtered = query.length > 1
    ? SUGGESTIONS.filter(s =>
        s.sym.toLowerCase().includes(query.toLowerCase()) ||
        s.name.toLowerCase().includes(query.toLowerCase()))
    : []

  return (
    <div className="px-6 py-8 border-b border-border bg-gradient-to-b from-card/40 to-transparent">
      {/* Heading */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold tracking-widest uppercase text-primary">Market Intelligence</span>
        </div>
        <h1 className="text-3xl font-bold text-balance text-foreground leading-tight">
          AI-Powered Stock Analysis
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time insights · ML forecasts · Smart signals
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all duration-200 ${
          focused
            ? "border-primary/60 glow-teal bg-card"
            : "border-border bg-card/60 hover:border-border/80"
        }`}>
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Search stock, index or sector..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-mono"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {filtered.length > 0 && focused && (
          <div className="absolute top-full mt-2 w-full glass-card rounded-xl border border-border shadow-xl z-50 overflow-hidden">
            {filtered.map(s => (
              <button
                key={s.sym}
                onMouseDown={() => { onSelectStock(s.sym); setQuery(""); }}
                className="flex items-center justify-between w-full px-4 py-3 hover:bg-secondary/60 transition-colors text-left"
              >
                <div>
                  <span className="font-mono font-bold text-sm text-foreground">{s.sym}</span>
                  <span className="text-xs text-muted-foreground ml-2">{s.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-foreground">₹{s.price}</div>
                  <div className={`text-xs font-semibold ${s.change.startsWith("+") ? "text-[oklch(0.72_0.18_162)]" : "text-[oklch(0.60_0.22_25)]"}`}>{s.change}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick picks */}
      <div className="flex flex-wrap gap-2 mt-4">
        <span className="text-xs text-muted-foreground self-center mr-1">Quick:</span>
        {QUICK_PICKS.map(sym => (
          <button
            key={sym}
            onClick={() => onSelectStock(sym)}
            className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border transition-all duration-150 ${
              activeStock === sym
                ? "bg-primary/20 border-primary/60 text-primary glow-teal"
                : "bg-secondary/40 border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {sym}
          </button>
        ))}
      </div>
    </div>
  )
}
