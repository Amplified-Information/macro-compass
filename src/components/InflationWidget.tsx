import { MacroAPIResponse } from "@/hooks/useMacroData";
import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
interface InflationWidgetProps {
  data: MacroAPIResponse | null;
}

function Meter({ label, value, min, max, unit, color }: { label: string; value: number; min: number; max: number; unit: string; color: string }) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium text-foreground">{value > 0 ? "+" : ""}{value.toFixed(2)}{unit}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

export function InflationWidget({ data }: InflationWidgetProps) {
  const inflation = data?.inflation;
  const oil = data?.oil;

  if (!inflation && !oil) return null;

  const breakeven = inflation?.breakeven ?? 0;
  const beDelta = inflation?.breakevenDelta ?? 0;
  const oilMom = inflation?.oilMomentum13w ?? oil?.changePercent ?? 0;
  const passThrough = inflation?.passThrough ?? 0;
  const score = inflation?.score ?? 0;

  const scoreColor = score === 1 ? "text-signal-bullish" : score === -1 ? "text-signal-bearish" : "text-signal-neutral";
  const scoreLabel = score === 1 ? "Contained" : score === -1 ? "Pressure Building" : "Monitoring";
  const scoreBg = score === 1 ? "bg-signal-bullish/10 border-signal-bullish/30" : score === -1 ? "bg-signal-bearish/10 border-signal-bearish/30" : "bg-signal-neutral/10 border-signal-neutral/30";

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Oil → Inflation Pass-Through</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Tracks how oil momentum feeds into CPI with 2–6 month lag</p>
        </div>
        <span className={`text-xs font-mono px-2.5 py-1 rounded-full border ${scoreBg} ${scoreColor}`}>
          {scoreLabel}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Breakeven Inflation */}
        <div className="space-y-3">
          <Meter
            label="5y5y Breakeven"
            value={breakeven}
            min={1.0}
            max={4.0}
            unit="%"
            color={breakeven > 2.8 ? "bg-signal-bearish" : breakeven > 2.3 ? "bg-signal-neutral" : "bg-signal-bullish"}
          />
          <Meter
            label="Breakeven Δ (30d)"
            value={beDelta}
            min={-0.5}
            max={0.5}
            unit="%"
            color={beDelta > 0.1 ? "bg-signal-bearish" : beDelta < -0.05 ? "bg-signal-bullish" : "bg-signal-neutral"}
          />
        </div>

        {/* Oil Momentum + Pass-Through */}
        <div className="space-y-3">
          <Meter
            label="Oil 30d Momentum"
            value={oilMom}
            min={-20}
            max={30}
            unit="%"
            color={oilMom > 15 ? "bg-signal-bearish" : oilMom > 8 ? "bg-signal-neutral" : "bg-signal-bullish"}
          />
          <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1">
            <div className="text-xs text-muted-foreground">Est. CPI Impact (6mo)</div>
            <div className={`text-lg font-mono font-bold ${passThrough > 0.3 ? "text-signal-bearish" : passThrough < 0 ? "text-signal-bullish" : "text-foreground"}`}>
              {passThrough > 0 ? "+" : ""}{passThrough.toFixed(2)}%
            </div>
            <div className="text-[10px] text-muted-foreground">
              ~0.35% CPI per 10% oil move
            </div>
          </div>
        </div>
      </div>

      {/* Transmission Chain Visual */}
      <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground py-2">
        <span className="px-2 py-1 rounded border border-border bg-muted/30 font-mono">Oil ${oil?.value?.toFixed(0) ?? "—"}</span>
        <span>→</span>
        <span className="px-2 py-1 rounded border border-border bg-muted/30">Energy CPI</span>
        <span>→</span>
        <span className="px-2 py-1 rounded border border-border bg-muted/30">PPI</span>
        <span>→</span>
        <span className="px-2 py-1 rounded border border-border bg-muted/30">Core CPI</span>
        <span className="text-muted-foreground/60">(2–6mo lag)</span>
      </div>

      {inflation?.asOf && (
        <div className="text-[10px] text-muted-foreground text-right font-mono">
          As of {inflation.asOf}
        </div>
      )}
    </div>
  );
}
