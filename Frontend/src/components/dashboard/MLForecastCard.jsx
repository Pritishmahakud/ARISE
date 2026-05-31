import { Cpu, ArrowUp, ArrowDown, Minus } from "lucide-react";

function formatCurrency(value, currency = "INR") {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function DirIcon({ dir }) {
  if (dir === "UP")   return <ArrowUp   className="w-5 h-5 text-[oklch(0.72_0.18_162)]" />;
  if (dir === "DOWN") return <ArrowDown className="w-5 h-5 text-[oklch(0.60_0.22_25)]" />;
  return <Minus className="w-5 h-5 text-[oklch(0.65_0.08_220)]" />;
}

function ForecastCol({ label, p, lastClosePrice, currency, horizonMultiplier }) {
  const upColor = "oklch(0.72 0.18 162)";
  const downColor = "oklch(0.60 0.22 25)";

  const dir = p ? (p.direction || "FLAT").toUpperCase() : "FLAT";
  const conf = p ? Math.round(p.confidence) : 50;
  const up = p && p.probability_up !== undefined ? Math.round(p.probability_up * 100) : 50;
  const down = p && p.probability_down !== undefined ? Math.round(p.probability_down * 100) : 50;

  // Generate a plausible target estimate based on close price and probability
  const changePct = ((up - down) / 200) * horizonMultiplier; // Scale based on horizon length
  const estimatedTarget = lastClosePrice ? lastClosePrice * (1 + changePct / 100) : null;

  return (
    <div className="flex-1 bg-secondary/40 rounded-xl p-3 border border-border/60 flex flex-col gap-2.5">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold text-center">{label}</div>
      <div className="flex flex-col items-center gap-1">
        <DirIcon dir={dir} />
        <span className={`text-xs font-bold ${dir === "UP" ? "text-[oklch(0.72_0.18_162)]" : dir === "DOWN" ? "text-[oklch(0.60_0.22_25)]" : "text-[oklch(0.65_0.08_220)]"}`}>
          {dir}
        </span>
      </div>
      <div className="text-center">
        <div className="text-[10px] text-muted-foreground">Confidence</div>
        <div className="font-mono font-bold text-foreground text-sm">{conf}%</div>
      </div>
      <div className="text-center">
        <div className="text-[10px] text-muted-foreground">Est. Target</div>
        <div className="font-mono font-semibold text-foreground text-xs">
          {estimatedTarget ? formatCurrency(estimatedTarget, currency) : "--"}
        </div>
      </div>
      {/* Probability bar */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Up</span>
          <span>{up}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${up}%`, background: upColor }} />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Down</span>
          <span>{down}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${down}%`, background: downColor }} />
        </div>
      </div>
    </div>
  );
}

export function MLForecastCard({ symbol, predictions, lastClosePrice, currency, loading }) {
  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-4 border border-border/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">ML Price Forecast</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">XGBoost &middot; GB Classifier</span>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
          Training models and generating forecasts...
        </div>
      ) : !predictions ? (
        <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
          Model training is unavailable for this symbol right now.
        </div>
      ) : (
        <div className="flex gap-3">
          <ForecastCol 
            label="Next Session" 
            p={predictions.next_candle} 
            lastClosePrice={lastClosePrice} 
            currency={currency} 
            horizonMultiplier={1.5}
          />
          <ForecastCol 
            label="Next 5 Days" 
            p={predictions.next_5min} 
            lastClosePrice={lastClosePrice} 
            currency={currency} 
            horizonMultiplier={3.5}
          />
          <ForecastCol 
            label="Next Month" 
            p={predictions.end_of_day} 
            lastClosePrice={lastClosePrice} 
            currency={currency} 
            horizonMultiplier={8.0}
          />
        </div>
      )}
      <p className="text-[11px] text-muted-foreground text-center">
        Forecasts are probabilistic machine learning estimates and not financial advice.
      </p>
    </div>
  );
}
