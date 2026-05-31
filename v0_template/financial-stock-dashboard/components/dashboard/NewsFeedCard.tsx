"use client"

import { Newspaper, ExternalLink, Clock } from "lucide-react"

const NEWS = [
  { tag: "ET Markets",    time: "12m ago", headline: "Reliance Industries eyes ₹1 lakh crore capex in green energy over next 3 years", summary: "RIL chairman Mukesh Ambani outlined an aggressive renewable energy transition plan, targeting 100 GW of solar capacity by 2035.", sentiment: "positive" },
  { tag: "Moneycontrol", time: "28m ago", headline: "FIIs turn net buyers in Indian equities, pour ₹8,400 crore in two sessions",            summary: "Foreign portfolio investors have reversed their selling streak, driven by improving macroeconomic signals and softer US dollar.",  sentiment: "positive" },
  { tag: "Bloomberg",    time: "1h ago",  headline: "India's GDP growth forecast revised upward to 7.2% by IMF for FY26",                     summary: "The IMF upgrade cites strong domestic consumption, robust services exports, and government infrastructure spending as key tailwinds.", sentiment: "positive" },
  { tag: "Business Std", time: "2h ago",  headline: "RBI holds repo rate at 6.25%; stance changed to 'accommodative'",                       summary: "The MPC voted 5-1 to keep rates unchanged but shifted stance, signaling a possible cut in the August policy meeting.",            sentiment: "neutral" },
  { tag: "CNBC TV18",    time: "3h ago",  headline: "Zomato Q4 preview: Net profit seen at ₹310 crore; Blinkit GMV to cross ₹8,200 crore",   summary: "Analysts expect robust performance driven by quick commerce acceleration and food delivery margin expansion.",                  sentiment: "positive" },
  { tag: "LiveMint",     time: "4h ago",  headline: "IT sector faces headwinds as US clients defer discretionary spending into Q3",           summary: "Several mid-cap IT companies have flagged slower ramp-ups in new deals due to budget caution among North American enterprises.",   sentiment: "negative" },
]

const sentimentColor: Record<string, string> = {
  positive: "oklch(0.72 0.18 162)",
  negative: "oklch(0.60 0.22 25)",
  neutral:  "oklch(0.65 0.08 220)",
}

function NewsCard({ item }: { item: typeof NEWS[0] }) {
  return (
    <div className="glass-card rounded-xl p-4 border border-border/50 flex flex-col gap-2 group hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-secondary/80 text-[10px] font-semibold text-muted-foreground border border-border">
            {item.tag}
          </span>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sentimentColor[item.sentiment] }} />
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          {item.time}
        </div>
      </div>
      <h3 className="text-sm font-semibold text-foreground leading-snug text-pretty line-clamp-2">
        {item.headline}
      </h3>
      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
        {item.summary}
      </p>
      <button className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors mt-auto pt-1 w-fit">
        Open story <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  )
}

export function NewsFeedSection() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Newspaper className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-primary uppercase tracking-widest">Market News</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {NEWS.map((item, i) => <NewsCard key={i} item={item} />)}
      </div>
    </div>
  )
}
