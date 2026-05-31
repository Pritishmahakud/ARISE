import { useState } from "react";
import { Search, X, Zap } from "lucide-react";

const QUICK_PICKS = [
  "RELIANCE", "TCS", "INFY", "ETERNAL", "BEL",
  "NIFTY 50", "BANKNIFTY", "SENSEX"
];

export function HeroSearch({ 
  query, 
  setQuery, 
  searchResults, 
  searchLoading, 
  activeStock, 
  onSelectStock,
  onSubmit
}) {
  const [focused, setFocused] = useState(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit(e);
  };

  return (
    <div className="px-6 py-8 border-b border-border bg-gradient-to-b from-card/40 to-transparent">
      {/* Heading */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold tracking-widest uppercase text-primary">Market Intelligence</span>
        </div>
        <h1 className="text-3xl font-bold text-balance text-foreground leading-tight text-primary">
          ARISE
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time insights · ML forecasts · Smart signals
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <form onSubmit={handleSearchSubmit}>
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
              onBlur={() => setTimeout(() => setFocused(false), 200)}
              placeholder="Search stock, index or sector..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-mono"
            />
            {searchLoading && <span className="text-xs text-muted-foreground animate-pulse mr-1">Searching...</span>}
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>

        {/* Suggestions dropdown */}
        {searchResults && searchResults.length > 0 && focused && (
          <div className="absolute top-full mt-2 w-full glass-card rounded-xl border border-border shadow-xl z-50 overflow-hidden">
            {searchResults.map(s => (
              <button
                key={s.symbol}
                onMouseDown={() => { onSelectStock(s.symbol); setQuery(s.symbol); }}
                className="flex items-center justify-between w-full px-4 py-3 hover:bg-secondary/60 transition-colors text-left"
              >
                <div>
                  <span className="font-mono font-bold text-sm text-foreground">{s.symbol}</span>
                  <span className="text-xs text-muted-foreground ml-2">{s.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground font-mono">{s.type} - {s.exchange}</div>
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
  );
}
