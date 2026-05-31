import React from "react";
import { 
  Server, 
  Activity, 
  Database, 
  ShieldAlert, 
  Cpu, 
  Clock, 
  TrendingUp, 
  BarChart2, 
  HelpCircle 
} from "lucide-react";

export function SystemPage() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      
      {/* Upper grid containing AI Model Dashboard & Market Regime Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Model status */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5 border border-border/60 flex flex-col gap-4">
          <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-primary" /> AI Model Status & Specifications
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="bg-secondary/20 border border-border/30 rounded-xl p-3 flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-sans font-semibold">Model Status</span>
              <span className="text-sm font-bold text-[oklch(0.72_0.18_162)] mt-1 flex items-center gap-1">
                <span className="w-2 h-2 bg-[oklch(0.72_0.18_162)] rounded-full animate-pulse" /> Active
              </span>
            </div>
            <div className="bg-secondary/20 border border-border/30 rounded-xl p-3 flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-sans font-semibold">Model Version</span>
              <span className="text-sm font-bold text-foreground mt-1">v2.5-GBClassifier</span>
            </div>
            <div className="bg-secondary/20 border border-border/30 rounded-xl p-3 flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-sans font-semibold">Inference Latency</span>
              <span className="text-sm font-bold text-foreground mt-1">24.5 ms</span>
            </div>
            <div className="bg-secondary/20 border border-border/30 rounded-xl p-3 flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-sans font-semibold">Last Training</span>
              <span className="text-sm font-bold text-foreground mt-1">12 hours ago</span>
            </div>
            <div className="bg-secondary/20 border border-border/30 rounded-xl p-3 flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-sans font-semibold">Prediction Accuracy</span>
              <span className="text-sm font-bold text-primary mt-1">79.2%</span>
            </div>
            <div className="bg-secondary/20 border border-border/30 rounded-xl p-3 flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-sans font-semibold">Inference Threads</span>
              <span className="text-sm font-bold text-foreground mt-1">8 (CPU-Optimized)</span>
            </div>
          </div>
        </div>

        {/* Market Regime */}
        <div className="lg:col-span-1 glass-card rounded-2xl p-5 border border-border/60 bg-secondary/15 flex flex-col gap-4">
          <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-primary" /> Market Regime Engine
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center pb-2 border-b border-border/30 text-xs">
              <span className="text-muted-foreground">Current State</span>
              <span className="font-bold text-primary">Bullish Consolidation</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-border/30 text-xs">
              <span className="text-muted-foreground">Regime Confidence</span>
              <span className="font-bold text-foreground font-mono">74%</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Macro Volatility</span>
              <span className="font-semibold text-emerald-400">Low Volatility</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed italic bg-background/50 p-2.5 rounded-lg border border-border/10 mt-1">
              "Macro volume indexes support constructive sideways-to-bullish ranges. Broad market beta is low, favoring thematic stock picking."
            </p>
          </div>
        </div>
      </div>

      {/* Middle grid containing Explainability and Accuracy Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* AI Explainability */}
        <div className="glass-card rounded-2xl p-5 border border-border/60 flex flex-col gap-4">
          <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-primary" /> AI Prediction Explainability Center
          </div>
          <div className="flex flex-col gap-3 font-mono text-xs mt-2">
            {[
              { label: "Technical Indicators (EMA, RSI, BB)", pct: 35, color: "bg-primary" },
              { label: "Volume Analysis (VWAP, Spikes)", pct: 25, color: "bg-teal-500" },
              { label: "News Sentiment & Headlines Impact", pct: 20, color: "bg-emerald-500" },
              { label: "Broad Market Sentiment (NIFTY beta)", pct: 10, color: "bg-amber-500" },
              { label: "ML Forecast Historical Residuals", pct: 10, color: "bg-rose-500" }
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-muted-foreground">
                  <span className="font-sans font-medium">{item.label}</span>
                  <span>{item.pct}%</span>
                </div>
                <div className="h-2 bg-secondary/60 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Accuracy Analytics */}
        <div className="glass-card rounded-2xl p-5 border border-border/60 bg-secondary/15 flex flex-col gap-4">
          <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-primary" /> Prediction Accuracy Analytics
          </div>
          <div className="flex flex-col gap-3 text-xs">
            <div className="grid grid-cols-3 gap-3 text-center mt-2 font-mono">
              <div className="bg-background/40 border border-border/20 p-2.5 rounded-xl">
                <span className="text-[10px] text-muted-foreground uppercase font-sans">7-Day</span>
                <div className="font-bold text-[oklch(0.72_0.18_162)] mt-0.5">82.1%</div>
              </div>
              <div className="bg-background/40 border border-border/20 p-2.5 rounded-xl">
                <span className="text-[10px] text-muted-foreground uppercase font-sans">30-Day</span>
                <div className="font-bold text-primary mt-0.5">79.2%</div>
              </div>
              <div className="bg-background/40 border border-border/20 p-2.5 rounded-xl">
                <span className="text-[10px] text-muted-foreground uppercase font-sans">90-Day</span>
                <div className="font-bold text-foreground mt-0.5">76.8%</div>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 mt-2">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Sector-wise accuracy</span>
              {[
                { name: "IT Sector", val: "84.5%" },
                { name: "Banking & Finance", val: "79.0%" },
                { name: "Energy & Infrastructure", val: "75.2%" }
              ].map(sec => (
                <div key={sec.name} className="flex justify-between font-mono py-1.5 border-b border-border/20 text-muted-foreground">
                  <span className="font-sans">{sec.name}</span>
                  <strong className="text-foreground">{sec.val}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Data feed connections & Risk Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Risk engine */}
        <div className="lg:col-span-1 glass-card rounded-2xl p-5 border border-border/60 bg-secondary/15 flex flex-col gap-3 text-xs">
          <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-primary" /> System Risk Engine
          </div>
          <div className="flex flex-col gap-2.5 mt-2 font-mono">
            {[
              { label: "Market Risk", val: "Low", color: "text-emerald-400" },
              { label: "Sector Risk", val: "Medium", color: "text-amber-400" },
              { label: "Volatility Risk", val: "Low", color: "text-emerald-400" },
              { label: "Portfolio Risk", val: "Medium", color: "text-amber-400" },
              { label: "Systemic Risk", val: "Low", color: "text-emerald-400" }
            ].map(r => (
              <div key={r.label} className="flex justify-between py-1 border-b border-border/20">
                <span className="text-muted-foreground font-sans">{r.label}</span>
                <strong className={r.color}>{r.val}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Data feeds check */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5 border border-border/60 flex flex-col gap-4">
          <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
            <Server className="w-4 h-4 text-primary" /> Live Data Pipeline Monitoring
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono text-xs">
            {[
              { name: "NSE Live Feed", status: "Online" },
              { name: "Yahoo Finance Feed", status: "Online" },
              { name: "News API Feed", status: "Online" },
              { name: "AI Inference Server", status: "Online" },
              { name: "PostgreSQL Database", status: "Online" },
              { name: "Redis Memory Cache", status: "Online" },
              { name: "WebSocket Gateway", status: "Online" }
            ].map((feed, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border border-border/30 bg-secondary/15">
                <span className="font-sans text-muted-foreground">{feed.name}</span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> {feed.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Decision logs */}
      <div className="glass-card rounded-2xl p-5 border border-border/60 flex flex-col gap-4">
        <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-primary" /> AI Model Decision Logs
        </div>
        <div className="flex flex-col gap-2 font-mono text-xs max-h-40 overflow-y-auto divide-y divide-border/25">
          {[
            { log: "INFERENCE: Computed direction 'UP' for HFCL (conf: 88%) - Expected upside +9.1%", time: "10s ago" },
            { log: "SIGNAL: Shifted rating on TCS from 'Hold' to 'Buy' (conf: 84%) - Oversold breakout", time: "1m ago" },
            { log: "PIPELINE: Refreshed NSE options chain tick parameters for RELIANCE", time: "2m ago" },
            { log: "INFERENCE: Retrained local XGBoost model on BEL historical candle shifts", time: "12h ago" }
          ].map((log, idx) => (
            <div key={idx} className="flex justify-between py-2 text-muted-foreground">
              <span className="font-sans text-[11px] leading-relaxed">{log.log}</span>
              <span className="text-[10px] text-muted-foreground ml-3 shrink-0">{log.time}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
