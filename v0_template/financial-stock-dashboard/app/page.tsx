"use client"

import { useState } from "react"
import { TickerMarquee } from "@/components/dashboard/TickerMarquee"
import { HeroSearch } from "@/components/dashboard/HeroSearch"
import { StockOverviewCard } from "@/components/dashboard/StockOverviewCard"
import { ChartCard } from "@/components/dashboard/ChartCard"
import { AITradingCard } from "@/components/dashboard/AITradingCard"
import { MLForecastCard } from "@/components/dashboard/MLForecastCard"
import { NewsFeedSection } from "@/components/dashboard/NewsFeedCard"
import { MarketPulseTable } from "@/components/dashboard/MarketPulseTable"
import { Activity } from "lucide-react"

export default function DashboardPage() {
  const [activeStock, setActiveStock] = useState("RELIANCE")

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Nav */}
      <nav className="flex items-center justify-between px-6 py-3 border-b border-border/60 bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center glow-teal">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-foreground tracking-tight text-base">MarketLens</span>
          <span className="hidden sm:inline text-[10px] font-semibold text-primary/70 uppercase tracking-widest border border-primary/30 px-1.5 py-0.5 rounded ml-1">
            PRO
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.72_0.18_162)] animate-pulse" />
            NSE Open &middot; 10:42 IST
          </div>
          <div className="flex items-center gap-1">
            {["Dashboard", "Screener", "Portfolio", "Alerts"].map(item => (
              <button
                key={item}
                className={`hidden md:block text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  item === "Dashboard"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-bold text-primary">
            VK
          </div>
        </div>
      </nav>

      {/* Ticker Marquee */}
      <TickerMarquee />

      {/* Hero + Search */}
      <HeroSearch activeStock={activeStock} onSelectStock={setActiveStock} />

      {/* Main Content */}
      <main className="flex-1 px-4 md:px-6 py-6 max-w-[1600px] mx-auto w-full">
        {/* Primary row: Overview + Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          <div className="lg:col-span-1">
            <StockOverviewCard symbol={activeStock} />
          </div>
          <div className="lg:col-span-2">
            <ChartCard symbol={activeStock} />
          </div>
        </div>

        {/* Secondary row: AI Read + ML Forecast */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <AITradingCard symbol={activeStock} />
          <MLForecastCard symbol={activeStock} />
        </div>

        {/* Tertiary row: News + Pulse table */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
          <div className="xl:col-span-3">
            <NewsFeedSection />
          </div>
          <div className="xl:col-span-2">
            <MarketPulseTable activeStock={activeStock} onSelectStock={setActiveStock} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 px-6 py-4 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          &copy; 2026 MarketLens &middot; Data for informational purposes only &middot; Not financial advice
        </span>
        <span className="font-mono">Build v2.4.1</span>
      </footer>
    </div>
  )
}
