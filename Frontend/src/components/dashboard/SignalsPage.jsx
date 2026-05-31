import React, { useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Filter, 
  CheckCircle, 
  AlertCircle, 
  Award, 
  Zap, 
  Briefcase 
} from "lucide-react";

const MOCK_SIGNALS = [
  { symbol: "RELIANCE", type: "Strong Buy", confidence: 91, entry: 1321.90, target: 1390.00, stopLoss: 1290.00, upside: 5.15, risk: "Low", style: "Swing Trade", reasons: ["EMA20 crossed EMA50", "Positive volume expansion", "Strong market structure", "Bullish sentiment", "Forecasted upside +5.2%"] },
  { symbol: "TCS", type: "Buy", confidence: 84, entry: 3820.00, target: 4050.00, stopLoss: 3730.00, upside: 6.02, risk: "Medium", style: "Swing Trade", reasons: ["RSI oversold rebound", "Bullish Engulfing pattern", "Institutional buying volume support"] },
  { symbol: "INFY", type: "Hold", confidence: 62, entry: 1450.00, target: 1490.00, stopLoss: 1410.00, upside: 2.75, risk: "Low", style: "Long Term", reasons: ["Consolidating near 200 DMA", "Average volume levels", "Flat moving average momentum"] },
  { symbol: "BEL", type: "Strong Sell", confidence: 89, entry: 412.35, target: 370.00, stopLoss: 430.00, upside: -10.27, risk: "High", style: "Intraday", reasons: ["Lower Low market structure", "RSI overbought reversal", "High Call writing build-up resistance"] },
  { symbol: "ETERNAL", type: "Sell", confidence: 71, entry: 250.00, target: 232.00, stopLoss: 259.00, upside: -7.20, risk: "Medium", style: "Positional", reasons: ["Double Top formation resistance", "Negative volume flow index", "Bearish crossover in MACD"] },
  { symbol: "HFCL", type: "Strong Buy", confidence: 88, entry: 178.73, target: 195.00, stopLoss: 171.00, upside: 9.10, risk: "Medium", style: "Swing Trade", reasons: ["Resistance breakout on volume", "Higher Low swing confirmation", "MACD histogram expanding upwards"] },
  { symbol: "SBIN", type: "Buy", confidence: 79, entry: 820.00, target: 865.00, stopLoss: 800.00, upside: 5.48, risk: "Low", style: "Long Term", reasons: ["Strong sector leadership momentum", "Golden Cross setup", "Robust earnings growth support"] },
  { symbol: "HDFCBANK", type: "Hold", confidence: 55, entry: 1510.00, target: 1545.00, stopLoss: 1490.00, upside: 2.31, risk: "Low", style: "Long Term", reasons: ["F&O long unwinding signals", "Rangebound near pivot support"] }
];

function formatCurrency(value, currency = "INR") {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function SignalsPage({ onSelectStock }) {
  const [selectedStyle, setSelectedStyle] = useState("All");
  const [selectedSignalItem, setSelectedSignalItem] = useState(MOCK_SIGNALS[0]);

  const filteredSignals = MOCK_SIGNALS.filter(sig => {
    if (selectedStyle === "All") return true;
    return sig.style.toLowerCase().includes(selectedStyle.toLowerCase()) || 
           (selectedStyle === "Futures" && sig.style === "Intraday") || 
           (selectedStyle === "Options" && sig.style === "Swing Trade");
  });

  const categories = ["Strong Buy", "Buy", "Hold", "Sell", "Strong Sell"];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      
      {/* Upper header section showing filters and historical stats side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Performance tracking */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5 border border-border/60 flex flex-col gap-3">
          <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
            <Award className="w-4 h-4 text-primary" /> AI Model Signal Performance (Last 30 Days)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
            {[
              { label: "Win Rate", value: "78.4%", color: "text-[oklch(0.72_0.18_162)]" },
              { label: "Accuracy", value: "81.2%", color: "text-primary" },
              { label: "Average Return", value: "+14.25%", color: "text-[oklch(0.72_0.18_162)]" },
              { label: "Active Signals", value: "14 opportunities", color: "text-foreground" }
            ].map((stat, idx) => (
              <div key={idx} className="bg-secondary/20 border border-border/30 rounded-xl p-3 flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">{stat.label}</span>
                <span className={`text-base font-bold font-mono mt-1 ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1.5 text-xs text-muted-foreground">
            <div className="flex justify-between p-2 bg-secondary/10 rounded-lg">
              <span>Best Signal: <strong>HFCL (+32.4%)</strong></span>
              <span className="text-[oklch(0.72_0.18_162)] font-semibold font-mono">Hit Target</span>
            </div>
            <div className="flex justify-between p-2 bg-secondary/10 rounded-lg">
              <span>Worst Signal: <strong>BEL (-4.1%)</strong></span>
              <span className="text-[oklch(0.60_0.22_25)] font-semibold font-mono">Stopped Out</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="lg:col-span-1 glass-card rounded-2xl p-5 border border-border/60 flex flex-col gap-3">
          <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-primary" /> Trading Style Filter
          </div>
          <div className="grid grid-cols-3 gap-1.5 mt-2">
            {["All", "Intraday", "Swing Trade", "Positional", "Long Term", "Futures", "Options"].map(style => (
              <button
                key={style}
                onClick={() => setSelectedStyle(style)}
                className={`px-2 py-1.5 rounded-lg border text-[10px] font-semibold transition-colors ${selectedStyle === style ? "bg-primary/15 border-primary text-primary" : "border-border/60 text-muted-foreground hover:text-foreground"}`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Signal list and Signal Explanation side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        
        {/* Recommendation lists */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          <div className="glass-card rounded-2xl p-5 border border-border/60 flex flex-col gap-4">
            <div className="font-bold text-foreground text-sm">Actionable Trading Recommendations</div>
            
            <div className="flex flex-col gap-3">
              {filteredSignals.map(sig => {
                const isBuy = sig.type.includes("Buy");
                const isSell = sig.type.includes("Sell");
                
                return (
                  <div 
                    key={sig.symbol} 
                    onClick={() => setSelectedSignalItem(sig)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${selectedSignalItem?.symbol === sig.symbol ? "bg-primary/5 border-primary glow-teal" : "border-border/50 bg-secondary/10 hover:border-border"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectStock) onSelectStock(sig.symbol);
                        }}
                        className="px-3 py-2 bg-secondary/60 hover:bg-primary/20 border border-border hover:border-primary/50 rounded-lg text-center cursor-pointer group"
                        title="Click to view Stock Dashboard"
                      >
                        <div className="font-mono font-bold text-xs text-foreground group-hover:text-primary transition-colors">{sig.symbol}</div>
                        <div className="text-[9px] text-muted-foreground uppercase font-sans tracking-widest mt-0.5">Explore</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${isBuy ? "bg-emerald-500/10 text-emerald-400" : isSell ? "bg-rose-500/10 text-rose-400" : "bg-zinc-500/10 text-zinc-400"}`}>
                            {sig.type}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">Confidence: {sig.confidence}%</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          Style: <span className="font-semibold text-foreground">{sig.style}</span> &middot; Risk: <span className="font-semibold text-foreground">{sig.risk}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center sm:text-right font-mono text-[11px] sm:min-w-[240px]">
                      <div>
                        <div className="text-[9px] text-muted-foreground uppercase font-sans">Entry</div>
                        <div className="font-semibold text-foreground mt-0.5">{formatCurrency(sig.entry)}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-muted-foreground uppercase font-sans">Target</div>
                        <div className="font-semibold text-[oklch(0.72_0.18_162)] mt-0.5">{formatCurrency(sig.target)}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-muted-foreground uppercase font-sans">Expected</div>
                        <div className={`font-semibold mt-0.5 ${sig.upside >= 0 ? "text-[oklch(0.72_0.18_162)]" : "text-[oklch(0.60_0.22_25)]"}`}>
                          {sig.upside >= 0 ? "+" : ""}{sig.upside}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Signal Explanation Panel */}
        <div className="xl:col-span-1 flex flex-col gap-4">
          <div className="glass-card rounded-2xl p-5 border border-border/60 bg-secondary/15 flex flex-col gap-4 sticky top-20">
            <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-primary animate-pulse" /> Signal Explanation Panel
            </div>
            
            {selectedSignalItem ? (
              <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="pb-3 border-b border-border/30">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-base text-foreground">{selectedSignalItem.symbol}</span>
                    <span className="text-[10px] text-muted-foreground">Style: {selectedSignalItem.style}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${selectedSignalItem.type.includes("Buy") ? "bg-emerald-500/10 text-emerald-400" : selectedSignalItem.type.includes("Sell") ? "bg-rose-500/10 text-rose-400" : "bg-zinc-500/10 text-zinc-400"}`}>
                      {selectedSignalItem.type}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-primary">Confidence: {selectedSignalItem.confidence}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-background/50 border border-border/20 p-3 rounded-xl font-mono">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-sans">Stop Loss</span>
                    <div className="font-semibold text-[oklch(0.60_0.22_25)] mt-0.5">{formatCurrency(selectedSignalItem.stopLoss)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-sans">Risk Rating</span>
                    <div className="font-semibold text-foreground mt-0.5">{selectedSignalItem.risk}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-foreground">Trigger Reasoning:</span>
                  <div className="flex flex-col gap-1.5 text-xs text-muted-foreground font-sans">
                    {selectedSignalItem.reasons.map((r, idx) => (
                      <div key={idx} className="flex items-start gap-2 bg-background/30 p-2 rounded-lg border border-border/10">
                        <CheckCircle className="w-4 h-4 text-[oklch(0.72_0.18_162)] shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-muted-foreground">Select a Stock Signal to inspect technical reasoning.</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Real-time Alerts Panel */}
      <div className="glass-card rounded-2xl p-5 border border-border/60 flex flex-col gap-3">
        <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-primary" /> Real-Time Signal Alerts Log
        </div>
        <div className="flex flex-col gap-2 divide-y divide-border/25 max-h-48 overflow-y-auto">
          {[
            { msg: "Alert: Strong Buy triggered on HFCL at ₹178.73 (MACD breakout + Volume Spike)", time: "01:42 AM", type: "strong-buy" },
            { msg: "Alert: Resistance Breakout detected on RELIANCE at ₹1,321.90", time: "01:25 AM", type: "breakout" },
            { msg: "Alert: Reversal signal on BEL near support floor ₹399.35", time: "01:05 AM", type: "reversal" },
            { msg: "Alert: Strong Sell triggered on SBIN at ₹820.00 (OI Call build-up peak)", time: "12:55 AM", type: "strong-sell" }
          ].map((alert, idx) => (
            <div key={idx} className="flex justify-between items-center text-xs py-2">
              <span className="text-muted-foreground font-medium">{alert.msg}</span>
              <span className="text-[10px] font-mono text-muted-foreground ml-3 shrink-0">{alert.time}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
