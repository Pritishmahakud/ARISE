import { Brain, CheckCircle2, XCircle, MinusCircle } from "lucide-react";

export function AITradingCard({ analysis }) {
  const bias = analysis?.bias || "Neutral";
  const score = analysis?.composite_score !== undefined ? Math.max(0, Math.min(100, Math.round((analysis.composite_score + 5) * 10))) : 50;
  const scoreRaw = analysis?.composite_score ?? 0;
  
  const biasColor = bias === "Bullish" 
    ? "oklch(0.72 0.18 162)" 
    : bias === "Bearish" 
      ? "oklch(0.60 0.22 25)" 
      : "oklch(0.65 0.08 220)";

  const BulletIcon = bias === "Bullish" ? CheckCircle2 : bias === "Bearish" ? XCircle : MinusCircle;
  const upsideOdds = analysis?.next_session_probability_up ?? 50;

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-4 border border-border/60">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">AI Trading Read</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">
          {analysis?.model_used || "composite-rule-engine"}
        </span>
      </div>

      {/* Bias + Score */}
      <div className="flex items-center gap-4">
        <div className="px-4 py-2 rounded-xl border-2 font-bold text-lg"
          style={{ borderColor: biasColor, color: biasColor, background: `${biasColor}1a` }}>
          {bias}
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Signal Score</span>
            <span className="font-mono font-bold text-foreground">
              {scoreRaw > 0 ? "+" : ""}{scoreRaw.toFixed(2)}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full"
              style={{ width: `${score}%`, background: biasColor }} />
          </div>
        </div>
      </div>

      {/* Upside Odds */}
      <div className="flex gap-3">
        <div className="flex-1 bg-secondary/50 rounded-xl p-3 border border-border/60">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Upside Odds</div>
          <div className="text-2xl font-bold font-mono mt-0.5" style={{ color: biasColor }}>{upsideOdds}%</div>
        </div>
        <div className="flex-1 bg-secondary/50 rounded-xl p-3 border border-border/60">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Downside Odds</div>
          <div className="text-2xl font-bold font-mono mt-0.5 text-[oklch(0.60_0.22_25)]">{100 - upsideOdds}%</div>
        </div>
      </div>

      {/* Outlook */}
      <p className="text-xs text-muted-foreground leading-relaxed border-l-2 pl-3" style={{ borderColor: biasColor }}>
        {analysis?.summary || "No AI reading summary available for this symbol."}
      </p>

      {/* Bullets */}
      <ul className="flex flex-col gap-1.5">
        {(analysis?.key_points || []).map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
            <BulletIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: biasColor }} />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
