"use client"

import { Brain, CheckCircle2, XCircle, MinusCircle } from "lucide-react"

const AI_DATA: Record<string, {
  bias: "Bullish" | "Bearish" | "Neutral"
  score: number
  outlook: string
  upsideOdds: number
  bullets: string[]
}> = {
  RELIANCE:    { bias: "Bullish",  score: 74, outlook: "Positive momentum with strong volume support above 20 DMA.", upsideOdds: 72, bullets: ["Price above all key DMAs", "RSI in healthy range (61)", "Institutional buying detected", "Breakout above ₹2,900 confirmed", "Strong O2C segment performance"] },
  TCS:         { bias: "Bullish",  score: 70, outlook: "IT sector recovery, deal wins boosting sentiment.",         upsideOdds: 68, bullets: ["Consecutive Q wins in large deals", "Stable margin guidance", "Dividend yield attractive", "FII accumulation trend", "AI division revenue growing 28% YoY"] },
  INFY:        { bias: "Neutral",  score: 48, outlook: "Mixed signals — caution advised near resistance.",           upsideOdds: 46, bullets: ["Below 20 DMA, watch 1,800 reclaim", "RSI at 48 — no clear directional bias", "Revenue growth guidance revised lower", "Margin pressure from wage hike cycle", "Strong cash position, low debt"] },
  "HDFC BANK": { bias: "Bullish",  score: 66, outlook: "Credit growth acceleration; NIM stable.",                   upsideOdds: 64, bullets: ["Loan book growth at 15% YoY", "NPA ratios improving", "CASA ratio healthy at 44%", "FII ownership at 52-week high", "RBI rate cycle turning supportive"] },
  "ICICI BANK":{ bias: "Neutral",  score: 51, outlook: "Consolidation phase; watch for 1,300 breakout.",            upsideOdds: 50, bullets: ["RSI at 51 — balanced risk", "Retail loan growth slowing", "Strong corporate banking", "Decent Q4 results expected", "Regulatory compliance strong"] },
  ZOMATO:      { bias: "Bullish",  score: 82, outlook: "Path-to-profitability narrative intact; momentum strong.",  upsideOdds: 78, bullets: ["RSI near overbought — use pullbacks", "Blinkit GMV growing 80% YoY", "First operating profit quarter delivered", "Market share gains vs competition", "Hyperpure B2B segment growing"] },
  NYKAA:       { bias: "Bearish",  score: 31, outlook: "Weak technicals and slowing GMV growth.",                   upsideOdds: 28, bullets: ["Below all key DMAs", "Promoter selling pressure", "GMV growth deceleration", "Margin recovery slower than expected", "RSI at 43 — weak momentum"] },
  PAYTM:       { bias: "Bullish",  score: 77, outlook: "RBI compliance clarity lifting sentiment sharply.",          upsideOdds: 73, bullets: ["Regulatory overhang lifting", "Financial services revenue recovering", "RSI at 71 — strong but watch for reversal", "Merchant subscriber base stable", "UPI market share rebounding"] },
  WIPRO:       { bias: "Neutral",  score: 54, outlook: "Moderate growth outlook; new CEO actions being watched.",   upsideOdds: 52, bullets: ["Revenue growth lags Tier-1 peers", "Margin improvement on track", "New CEO strategic pivot positive", "Healthcare vertical strong", "Dividend yield provides floor"] },
  BHARTIARTL:  { bias: "Bearish",  score: 38, outlook: "Rich valuations; tariff hike cycle peak may be in.",        upsideOdds: 35, bullets: ["P/E at 68x — expensive relative to history", "ARPU growth plateauing", "5G capex weighing on FCF", "Competition from Jio intensifying", "Below 20 DMA recently"] },
}

const DEFAULT_AI = AI_DATA["RELIANCE"]

interface Props { symbol: string }

export function AITradingCard({ symbol }: Props) {
  const d = AI_DATA[symbol] ?? DEFAULT_AI
  const biasColor = d.bias === "Bullish" ? "oklch(0.72 0.18 162)" : d.bias === "Bearish" ? "oklch(0.60 0.22 25)" : "oklch(0.65 0.08 220)"
  const scoreBg = d.score >= 60 ? "from-[oklch(0.72_0.18_162_/_0.3)]" : d.score >= 40 ? "from-[oklch(0.65_0.08_220_/_0.3)]" : "from-[oklch(0.60_0.22_25_/_0.3)]"

  const BulletIcon = d.bias === "Bullish" ? CheckCircle2 : d.bias === "Bearish" ? XCircle : MinusCircle

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-4 border border-border/60">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">AI Trading Read</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">GPT-4o Analysis</span>
      </div>

      {/* Bias + Score */}
      <div className="flex items-center gap-4">
        <div className={`px-4 py-2 rounded-xl border-2 font-bold text-lg`}
          style={{ borderColor: biasColor, color: biasColor, background: `${biasColor}1a` }}>
          {d.bias}
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Composite Score</span>
            <span className="font-mono font-bold text-foreground">{d.score}/100</span>
          </div>
          <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
            <div className={`h-full rounded-full bg-gradient-to-r ${scoreBg} to-transparent`}
              style={{ width: `${d.score}%`, background: biasColor }} />
          </div>
        </div>
      </div>

      {/* Upside Odds */}
      <div className="flex gap-3">
        <div className="flex-1 bg-secondary/50 rounded-xl p-3 border border-border/60">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Upside Odds</div>
          <div className="text-2xl font-bold font-mono mt-0.5" style={{ color: biasColor }}>{d.upsideOdds}%</div>
        </div>
        <div className="flex-1 bg-secondary/50 rounded-xl p-3 border border-border/60">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Downside Odds</div>
          <div className="text-2xl font-bold font-mono mt-0.5 text-[oklch(0.60_0.22_25)]">{100 - d.upsideOdds}%</div>
        </div>
      </div>

      {/* Outlook */}
      <p className="text-xs text-muted-foreground leading-relaxed border-l-2 pl-3" style={{ borderColor: biasColor }}>
        {d.outlook}
      </p>

      {/* Bullets */}
      <ul className="flex flex-col gap-1.5">
        {d.bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
            <BulletIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: biasColor }} />
            {b}
          </li>
        ))}
      </ul>
    </div>
  )
}
