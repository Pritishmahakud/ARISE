import { TrendingUp, TrendingDown } from "lucide-react";

function TickerPill({ label, price, change, up }) {
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
  );
}

export function TickerMarquee({ items, onIndexClick }) {
  const tickers = (items && items.length > 0) ? items.map(item => {
    const quote = item.quote;
    const currentPrice = quote?.current_price ?? 0;
    const percentChange = quote?.percent_change ?? 0;
    const isUp = percentChange >= 0;
    
    const formattedPrice = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: quote?.currency || "INR",
      maximumFractionDigits: 2,
    }).format(currentPrice);

    return {
      label: item.name,
      price: formattedPrice,
      change: `${isUp ? "+" : ""}${percentChange.toFixed(2)}%`,
      up: isUp,
      rawName: item.name
    };
  }) : [
    { label: "NIFTY 50",    price: "₹24,832.65", change: "+1.14%", up: true, rawName: "NIFTY 50" },
    { label: "NIFTY BANK",  price: "₹53,412.20", change: "-0.38%", up: false, rawName: "BANKNIFTY" },
    { label: "SENSEX",      price: "₹81,605.40", change: "+0.97%", up: true, rawName: "SENSEX" },
    { label: "NIFTY IT",    price: "₹38,220.75", change: "+2.31%", up: true, rawName: "NIFTY IT" },
  ];

  const doubled = [...tickers, ...tickers];

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
        {doubled.map((t, i) => (
          <button 
            key={i} 
            onClick={() => onIndexClick && onIndexClick(t.rawName)}
            className="text-left focus:outline-none hover:opacity-80"
          >
            <TickerPill {...t} />
          </button>
        ))}
      </div>
    </div>
  );
}
