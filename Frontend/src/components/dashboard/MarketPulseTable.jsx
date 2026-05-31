import { BarChart, TrendingUp, TrendingDown } from "lucide-react";

function formatNumber(value, options = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

function formatVolume(val) {
  if (!val) return "--";
  if (val >= 10000000) return `${(val / 10000000).toFixed(2)}Cr`;
  if (val >= 100000) return `${(val / 100000).toFixed(2)}L`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
  return val.toString();
}

export function MarketPulseTable({ items, onSelectStock, activeStock }) {
  const data = (items && items.length > 0) ? items.map(item => {
    const isUp = (item.percent_change ?? 0) >= 0;
    return {
      sym: item.symbol,
      price: formatNumber(item.current_price),
      chg: `${isUp ? "+" : ""}${formatNumber(item.percent_change)}%`,
      up: isUp,
      vol: formatVolume(item.volume),
      exchange: item.exchange || "NSE"
    };
  }) : [
    { sym: "RELIANCE",    price: "2,934.55", chg: "+1.21%", up: true,  vol: "1.24Cr",  exchange: "NSE" },
    { sym: "TCS",         price: "4,012.80", chg: "+1.22%", up: true,  vol: "81L",     exchange: "NSE" },
    { sym: "INFY",        price: "1,782.40", chg: "-0.81%", up: false, vol: "93L",     exchange: "NSE" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">Market Pulse</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">Top Volume &middot; NSE</span>
      </div>

      <div className="glass-card rounded-2xl border border-border/60 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-4 px-4 py-2 border-b border-border/60 bg-secondary/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Symbol</span>
          <span className="text-right">Price</span>
          <span className="text-right">Change</span>
          <span className="text-right">Volume</span>
        </div>

        {/* Rows */}
        <div className="max-h-[300px] overflow-y-auto">
          {data.map((w) => (
            <button
              key={w.sym}
              onClick={() => onSelectStock(w.sym)}
              className={`grid grid-cols-4 w-full px-4 py-2.5 text-left border-b border-border/30 last:border-0 transition-colors hover:bg-secondary/40 ${
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
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
