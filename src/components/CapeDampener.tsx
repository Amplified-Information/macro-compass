import { CAPE_VALUE, CAPE_ELEVATED } from "@/lib/macroSignals";
import { AlertTriangle, Shield } from "lucide-react";

export function CapeDampener() {
  if (!CAPE_ELEVATED) {
    return (
      <div className="rounded-lg border bg-card p-4 flex items-center gap-4">
        <div className="p-2 rounded-lg bg-secondary">
          <Shield className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-foreground">CAPE / Shiller PE Dampener</span>
          <p className="text-xs text-muted-foreground mt-0.5">Valuations within normal range — no cap applied</p>
        </div>
        <span className="text-sm font-mono font-semibold text-signal-bullish">INACTIVE</span>
      </div>
    );
  }

  const delta = CAPE_VALUE - 30;

  return (
    <div className="rounded-lg border-2 border-signal-neutral/50 bg-signal-neutral/10 p-4">
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-signal-neutral/20 shrink-0">
          <AlertTriangle className="h-6 w-6 text-signal-neutral" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-bold text-signal-neutral">CAPE DAMPENER ACTIVE</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-signal-neutral/20 text-signal-neutral border border-signal-neutral/30">
              {CAPE_VALUE.toFixed(1)}× (+{delta.toFixed(1)}× above threshold)
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Shiller PE exceeds 30× — maximum capital deployment capped at <span className="text-signal-neutral font-semibold">75%</span> regardless of composite score.
            This is the most important override in the system.
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-mono font-bold text-signal-neutral">75%</div>
          <div className="text-[10px] text-muted-foreground font-mono">MAX DEPLOY</div>
        </div>
      </div>
    </div>
  );
}
