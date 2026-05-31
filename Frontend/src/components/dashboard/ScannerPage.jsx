import React, { useState } from "react";
import { 
  Zap, 
  Search, 
  Plus, 
  Trash2, 
  Filter, 
  Sliders, 
  Eye, 
  TrendingUp, 
  BarChart2, 
  Activity, 
  Play 
} from "lucide-react";

const MOCK_OPPORTUNITIES = [
  { rank: 1, symbol: "HFCL", name: "HFCL Ltd", score: 94, expected: "+9.10%", confidence: 88, risk: "Medium", type: "Breakout" },
  { rank: 2, symbol: "RELIANCE", name: "Reliance Industries", score: 91, expected: "+5.15%", confidence: 91, risk: "Low", type: "Breakout" },
  { rank: 3, symbol: "SBIN", name: "State Bank of India", score: 87, expected: "+5.48%", confidence: 79, risk: "Low", type: "Momentum" },
  { rank: 4, symbol: "TCS", name: "TCS Ltd", score: 84, expected: "+6.02%", confidence: 84, risk: "Medium", type: "Reversal" },
  { rank: 5, symbol: "INFY", name: "Infosys Ltd", score: 79, expected: "+2.75%", confidence: 62, risk: "Low", type: "Pivot" },
  { rank: 6, symbol: "TATAMOTORS", name: "Tata Motors Ltd", score: 76, expected: "+4.20%", confidence: 71, risk: "Medium", type: "Momentum" },
  { rank: 7, symbol: "BEL", name: "Bharat Electronics", score: 72, expected: "-10.27%", confidence: 89, risk: "High", type: "Reversal" },
  { rank: 8, symbol: "ZOMATO", name: "Eternal Ltd", score: 68, expected: "+8.50%", confidence: 74, risk: "High", type: "Volume" }
];

const SCANNER_CATEGORIES = [
  { id: "ai", label: "AI Top Choices", icon: Zap },
  { id: "breakout", label: "Breakout Scanner", icon: TrendingUp },
  { id: "momentum", label: "Momentum Scanner", icon: Activity },
  { id: "reversal", label: "Reversal Scanner", icon: Sliders },
  { id: "pivot", label: "Pivot Levels", icon: Filter },
  { id: "volume", label: "Volume Spikes", icon: BarChart2 },
  { id: "fno", label: "F&O Build-Ups", icon: Sliders }
];

export function ScannerPage({ onSelectStock }) {
  const [activeCategory, setActiveCategory] = useState("ai");
  const [customConds, setCustomConds] = useState([
    { indicator: "Price", operator: ">", value: "EMA50" },
    { indicator: "RSI", operator: ">", value: "55" }
  ]);
  const [newIndicator, setNewIndicator] = useState("RSI");
  const [newOperator, setNewOperator] = useState(">");
  const [newValue, setNewValue] = useState("50");
  const [savedScanners, setSavedScanners] = useState([
    { name: "Bullish Trend Rider", conds: "Price > EMA50 AND RSI > 55" },
    { name: "Oversold Reversal", conds: "RSI < 30 AND Volume > 1.5x Avg" }
  ]);
  const [newScannerName, setNewScannerName] = useState("");

  const addCustomCondition = (e) => {
    e.preventDefault();
    setCustomConds([...customConds, { indicator: newIndicator, operator: newOperator, value: newValue }]);
  };

  const removeCustomCondition = (idx) => {
    setCustomConds(customConds.filter((_, i) => i !== idx));
  };

  const saveCustomScanner = () => {
    if (!newScannerName.trim()) return;
    const condsStr = customConds.map(c => `${c.indicator} ${c.operator} ${c.value}`).join(" AND ");
    setSavedScanners([...savedScanners, { name: newScannerName, conds: condsStr }]);
    setNewScannerName("");
  };

  // Get scanner output list based on category selection
  const scanResults = MOCK_OPPORTUNITIES.filter(opt => {
    if (activeCategory === "ai") return true;
    return opt.type.toLowerCase() === activeCategory.toLowerCase();
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      
      {/* Category selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-border/40 text-xs font-semibold">
        {SCANNER_CATEGORIES.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-colors shrink-0 ${activeCategory === cat.id ? "bg-primary/20 text-primary border border-primary/30" : "bg-secondary/30 text-muted-foreground hover:text-foreground border border-transparent"}`}
            >
              <Icon className="w-3.5 h-3.5" /> {cat.label}
            </button>
          );
        })}
      </div>

      {/* Main scanner grid and Custom builder */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        
        {/* Scanner results output */}
        <div className="xl:col-span-2 glass-card rounded-2xl p-5 border border-border/60 flex flex-col gap-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="font-bold text-foreground text-sm">
              Opportunity Scanner output: <span className="text-primary font-mono">{SCANNER_CATEGORIES.find(c => c.id === activeCategory)?.label}</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">Scanned: 1,480 NSE stocks</span>
          </div>

          <div className="overflow-x-auto border border-border/30 rounded-xl">
            <table className="w-full text-left border-collapse min-w-[550px] text-xs">
              <thead>
                <tr className="bg-secondary/40 border-b border-border/40 text-[10px] text-muted-foreground font-bold tracking-wider uppercase">
                  <th className="px-4 py-2.5 text-center w-12">Rank</th>
                  <th className="px-4 py-2.5">Stock</th>
                  <th className="px-4 py-2.5 text-center">AI Score</th>
                  <th className="px-4 py-2.5 text-right">Expected Return</th>
                  <th className="px-4 py-2.5 text-center">Confidence</th>
                  <th className="px-4 py-2.5 text-center">Risk Rating</th>
                  <th className="px-4 py-2.5 text-center">Explore</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/25 font-mono">
                {scanResults.map(opt => (
                  <tr key={opt.symbol} className="hover:bg-secondary/15">
                    <td className="px-4 py-3 text-center text-muted-foreground font-sans">{opt.rank}</td>
                    <td className="px-4 py-3 font-sans font-bold text-foreground">
                      <div className="flex flex-col">
                        <span>{opt.symbol}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">{opt.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-primary">{opt.score}/100</td>
                    <td className={`px-4 py-3 text-right font-bold ${opt.expected.startsWith("+") ? "text-[oklch(0.72_0.18_162)]" : "text-[oklch(0.60_0.22_25)]"}`}>
                      {opt.expected}
                    </td>
                    <td className="px-4 py-3 text-center">{opt.confidence}%</td>
                    <td className="px-4 py-3 text-center font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${opt.risk === "Low" ? "bg-emerald-500/10 text-emerald-400" : opt.risk === "Medium" ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"}`}>
                        {opt.risk}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onSelectStock && onSelectStock(opt.symbol)}
                        className="p-1 rounded bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 transition-colors"
                        title="Open Dashboard"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Custom condition builder */}
        <div className="xl:col-span-1 flex flex-col gap-5">
          
          {/* Builder interface */}
          <div className="glass-card rounded-2xl p-5 border border-border/60 bg-secondary/15 flex flex-col gap-4">
            <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-primary" /> Custom Scanner Builder
            </div>
            
            <form onSubmit={addCustomCondition} className="flex flex-col gap-3 border-b border-border/40 pb-4">
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={newIndicator}
                  onChange={(e) => setNewIndicator(e.target.value)}
                  className="bg-background border border-border/60 rounded text-[11px] text-foreground p-1.5 outline-none"
                >
                  <option value="Price" className="text-black bg-white">Price</option>
                  <option value="RSI" className="text-black bg-white">RSI</option>
                  <option value="Volume" className="text-black bg-white">Volume</option>
                  <option value="EMA50" className="text-black bg-white">EMA50</option>
                  <option value="MACD" className="text-black bg-white">MACD</option>
                </select>
                <select
                  value={newOperator}
                  onChange={(e) => setNewOperator(e.target.value)}
                  className="bg-background border border-border/60 rounded text-[11px] text-foreground p-1.5 outline-none"
                >
                  <option value=">" className="text-black bg-white">&gt;</option>
                  <option value="<" className="text-black bg-white">&lt;</option>
                  <option value="=" className="text-black bg-white">=</option>
                  <option value="crossed above" className="text-black bg-white">cross above</option>
                  <option value="crossed below" className="text-black bg-white">cross below</option>
                </select>
                <input
                  type="text"
                  placeholder="Value"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="bg-background border border-border/60 rounded text-[11px] text-foreground p-1.5 outline-none font-mono"
                />
              </div>
              <button 
                type="submit" 
                className="bg-primary text-primary-foreground font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 hover:opacity-90 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" /> Add Condition
              </button>
            </form>

            {/* List active conditions */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Active Filters</span>
              {customConds.map((cond, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-background/50 font-mono text-[11px]">
                  <span>{cond.indicator} {cond.operator} {cond.value}</span>
                  <button 
                    onClick={() => removeCustomCondition(idx)}
                    className="text-rose-400 hover:text-rose-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Save Custom Scanner */}
            <div className="border-t border-border/45 pt-4 flex flex-col gap-2 mt-1.5">
              <input
                type="text"
                placeholder="Scanner Name (e.g. Breakout 5m)"
                value={newScannerName}
                onChange={(e) => setNewScannerName(e.target.value)}
                className="bg-background border border-border/60 rounded text-[11px] text-foreground p-2 outline-none"
              />
              <button
                onClick={saveCustomScanner}
                className="bg-secondary hover:bg-secondary/80 border border-border text-foreground font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 text-primary" /> Run & Save Scanner
              </button>
            </div>
          </div>

          {/* Saved Scanners lists */}
          <div className="glass-card rounded-2xl p-5 border border-border/60 bg-secondary/15 flex flex-col gap-3">
            <span className="text-xs font-bold text-foreground">Saved Scanners</span>
            <div className="flex flex-col gap-2.5">
              {savedScanners.map((sc, i) => (
                <div key={i} className="p-3 bg-background/40 border border-border/30 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">{sc.name}</span>
                    <span className="text-[9px] text-muted-foreground font-mono mt-0.5">{sc.conds}</span>
                  </div>
                  <button 
                    onClick={() => setSavedScanners(savedScanners.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
