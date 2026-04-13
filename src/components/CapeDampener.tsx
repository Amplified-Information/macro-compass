import { CAPE_VALUE, CAPE_ELEVATED } from "@/lib/macroSignals";
import { Shield } from "lucide-react";

export function CapeDampener() {
  return (
    <div className={`rounded-lg border p-4 flex items-center gap-4 ${CAPE_ELEVATED ? "bg-signal-neutral/10 border-signal-neutral/30" : "bg-card"}`}>
      <div className={`p-2 rounded-lg ${CAPE_ELEVATED ? "bg-signal-neutral/10" : "bg-secondary"}`}>
        <Shield className={`h-5 w-5 ${CAPE_ELEVATED ? "text-signal-neutral" : "text-muted-foreground"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">CAPE / Shiller PE Dampener</span>
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${CAPE_ELEVATED ? "bg-signal-neutral/10 text-signal-neutral border border-signal-neutral/30" : "bg-secondary text-muted-foreground"}`}>
            {CAPE_VALUE.toFixed(1)}×
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {CAPE_ELEVATED
            ? "Elevated valuation — maximum capital deployment capped at 75% regardless of composite score"
            : "Valuations within normal range — no cap applied"}
        </p>
      </div>
      <div className={`text-sm font-mono font-semibold ${CAPE_ELEVATED ? "text-signal-neutral" : "text-signal-bullish"}`}>
        {CAPE_ELEVATED ? "ACTIVE" : "INACTIVE"}
      </div>
    </div>
  );
}
