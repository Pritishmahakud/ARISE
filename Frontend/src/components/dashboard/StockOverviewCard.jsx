import { TrendingUp, TrendingDown, Activity } from "lucide-react";

function formatNumber(value, options = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

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

export function StockOverviewCard({ symbol, quote, technicals }) {
  const currentPrice = quote?.current_price;
  const percentChange = quote?.percent_change ?? 0;
  const up = percentChange >= 0;
  const currency = quote?.currency || "INR";

  const rsiValue = technicals?.rsi_14;
  const rsiColor = rsiValue > 70 
    ? "text-[oklch(0.60_0.22_25)]" 
    : rsiValue < 30 
      ? "text-[oklch(0.60_0.22_25)]" 
      : "text-[oklch(0.72_0.18_162)]";

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
            <span className="text-xs text-muted-foreground mb-0.5 truncate max-w-[150px]">
              {quote?.name || "NSE · Equity"}
            </span>
          </div>
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${up ? "bg-[oklch(0.72_0.18_162_/_0.12)] border-[oklch(0.72_0.18_162_/_0.4)] text-[oklch(0.72_0.18_162)]" : "bg-[oklch(0.60_0.22_25_/_0.12)] border-[oklch(0.60_0.22_25_/_0.4)] text-[oklch(0.60_0.22_25)]"}`}>
          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {up ? "BULL" : "BEAR"}
        </div>
      </div>

      {/* Price */}
      <div>
        <div className="text-4xl font-bold font-mono text-foreground tracking-tight">
          {formatCurrency(currentPrice, currency)}
        </div>
        <div className={`flex items-center gap-1.5 mt-0.5 font-mono text-sm font-semibold ${up ? "text-[oklch(0.72_0.18_162)]" : "text-[oklch(0.60_0.22_25)]"}`}>
          {up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {percentChange > 0 ? "+" : ""}{formatNumber(percentChange)}% Today
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Volume",    value: formatNumber(quote?.volume) },
          { label: "20 DMA",   value: formatCurrency(technicals?.dma_20, currency) },
          { label: "50 DMA",   value: formatCurrency(technicals?.dma_50, currency) },
          { label: "200 DMA",  value: formatCurrency(technicals?.dma_200, currency) },
          { label: "RSI 14",   value: rsiValue ? formatNumber(rsiValue) : "--", custom: rsiColor },
          { label: "P/E Ratio",value: quote?.pe_ratio ? `${formatNumber(quote?.pe_ratio)}x` : "--" },
          { label: "Mkt Cap",  value: quote?.market_cap ? formatNumber(quote?.market_cap) : "--" },
          { label: "52W High", value: formatCurrency(quote?.fifty_two_week_high, currency) },
          { label: "52W Low",  value: formatCurrency(quote?.fifty_two_week_low, currency) },
        ].map(m => (
          <div key={m.label} className="bg-secondary/50 rounded-lg px-3 py-2 border border-border/60">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</div>
            <div className={`font-mono font-semibold text-sm mt-0.5 ${m.custom ?? "text-foreground"}`}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
