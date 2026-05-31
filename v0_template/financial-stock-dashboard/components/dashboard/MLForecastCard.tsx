"use client"

import { Cpu, ArrowUp, ArrowDown, Minus } from "lucide-react"

type Dir = "UP" | "DOWN" | "FLAT"

const ML_DATA: Record<string, {
  next1: { dir: Dir; conf: number; up: number; down: number; target: string }
  next5: { dir: Dir; conf: number; up: number; down: number; target: string }
  next30:{ dir: Dir; conf: number; up: number; down: number; target: string }
}> = {
  RELIANCE:    { next1: { dir:"UP",   conf:78, up:74, down:26, target:"2,965" }, next5: { dir:"UP",   conf:64, up:68, down:32, target:"3,010" }, next30:{ dir:"UP",   conf:58, up:61, down:39, target:"3,120" } },
  TCS:         { next1: { dir:"UP",   conf:72, up:70, down:30, target:"4,060" }, next5: { dir:"UP",   conf:61, up:64, down:36, target:"4,140" }, next30:{ dir:"UP",   conf:55, up:58, down:42, target:"4,280" } },
  INFY:        { next1: { dir:"DOWN", conf:61, up:38, down:62, target:"1,762" }, next5: { dir:"FLAT", conf:50, up:48, down:52, target:"1,775" }, next30:{ dir:"UP",   conf:54, up:56, down:44, target:"1,840" } },
  "HDFC BANK": { next1: { dir:"UP",   conf:67, up:64, down:36, target:"1,672" }, next5: { dir:"UP",   conf:60, up:63, down:37, target:"1,700" }, next30:{ dir:"UP",   conf:56, up:61, down:39, target:"1,740" } },
  "ICICI BANK":{ next1: { dir:"FLAT", conf:53, up:50, down:50, target:"1,284" }, next5: { dir:"UP",   conf:56, up:58, down:42, target:"1,310" }, next30:{ dir:"UP",   conf:54, up:57, down:43, target:"1,350" } },
  ZOMATO:      { next1: { dir:"UP",   conf:81, up:79, down:21, target:"243"   }, next5: { dir:"UP",   conf:70, up:74, down:26, target:"258"   }, next30:{ dir:"UP",   conf:65, up:68, down:32, target:"275"   } },
  NYKAA:       { next1: { dir:"DOWN", conf:68, up:30, down:70, target:"189"   }, next5: { dir:"DOWN", conf:62, up:34, down:66, target:"183"   }, next30:{ dir:"FLAT", conf:52, up:46, down:54, target:"192"   } },
  PAYTM:       { next1: { dir:"UP",   conf:75, up:73, down:27, target:"628"   }, next5: { dir:"UP",   conf:67, up:69, down:31, target:"658"   }, next30:{ dir:"UP",   conf:60, up:64, down:36, target:"690"   } },
  WIPRO:       { next1: { dir:"UP",   conf:58, up:56, down:44, target:"484"   }, next5: { dir:"FLAT", conf:52, up:51, down:49, target:"486"   }, next30:{ dir:"UP",   conf:55, up:57, down:43, target:"498"   } },
  BHARTIARTL:  { next1: { dir:"DOWN", conf:63, up:35, down:65, target:"1,408" }, next5: { dir:"DOWN", conf:57, up:38, down:62, target:"1,390" }, next30:{ dir:"FLAT", conf:51, up:48, down:52, target:"1,420" } },
}

const DEFAULT_ML = ML_DATA["RELIANCE"]

function DirIcon({ dir }: { dir: Dir }) {
  if (dir === "UP")   return <ArrowUp   className="w-5 h-5 text-[oklch(0.72_0.18_162)]" />
  if (dir === "DOWN") return <ArrowDown className="w-5 h-5 text-[oklch(0.60_0.22_25)]" />
  return <Minus className="w-5 h-5 text-[oklch(0.65_0.08_220)]" />
}

function ForecastCol({ label, data }: { label: string; data: { dir: Dir; conf: number; up: number; down: number; target: string } }) {
  const upColor = "oklch(0.72 0.18 162)"
  const downColor = "oklch(0.60 0.22 25)"

  return (
    <div className="flex-1 bg-secondary/40 rounded-xl p-3 border border-border/60 flex flex-col gap-2.5">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold text-center">{label}</div>
      <div className="flex flex-col items-center gap-1">
        <DirIcon dir={data.dir} />
        <span className={`text-xs font-bold ${data.dir === "UP" ? "text-[oklch(0.72_0.18_162)]" : data.dir === "DOWN" ? "text-[oklch(0.60_0.22_25)]" : "text-[oklch(0.65_0.08_220)]"}`}>
          {data.dir}
        </span>
      </div>
      <div className="text-center">
        <div className="text-[10px] text-muted-foreground">Confidence</div>
        <div className="font-mono font-bold text-foreground text-sm">{data.conf}%</div>
      </div>
      <div className="text-center">
        <div className="text-[10px] text-muted-foreground">Target</div>
        <div className="font-mono font-semibold text-foreground text-xs">₹{data.target}</div>
      </div>
      {/* Probability bar */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Up</span>
          <span>{data.up}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${data.up}%`, background: upColor }} />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Down</span>
          <span>{data.down}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${data.down}%`, background: downColor }} />
        </div>
      </div>
    </div>
  )
}

interface Props { symbol: string }

export function MLForecastCard({ symbol }: Props) {
  const d = ML_DATA[symbol] ?? DEFAULT_ML

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-4 border border-border/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">ML Price Forecast</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">LSTM · XGBoost · Ensemble</span>
      </div>
      <div className="flex gap-3">
        <ForecastCol label="Next Session" data={d.next1} />
        <ForecastCol label="Next 5 Days"  data={d.next5} />
        <ForecastCol label="Next Month"   data={d.next30} />
      </div>
      <p className="text-[11px] text-muted-foreground text-center">
        Forecasts are probabilistic estimates and not financial advice.
      </p>
    </div>
  )
}
