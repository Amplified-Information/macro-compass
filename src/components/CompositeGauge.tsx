import { CompositeResult } from "@/lib/macroSignals";

const regimeColors: Record<string, string> = {
  full: "text-signal-bullish",
  half: "text-signal-neutral",
  minimal: "text-signal-neutral",
  cash: "text-signal-bearish",
};

const regimeBg: Record<string, string> = {
  full: "bg-signal-bullish/10 border-signal-bullish/30",
  half: "bg-signal-neutral/10 border-signal-neutral/30",
  minimal: "bg-signal-neutral/10 border-signal-neutral/30",
  cash: "bg-signal-bearish/10 border-signal-bearish/30",
};

export function CompositeGauge({ result }: { result: CompositeResult }) {
  const pct = ((result.finalScore + 1) / 2) * 100;
  const scoreColor = result.finalScore > 0.5 ? "text-signal-bullish" : result.finalScore > 0 ? "text-signal-neutral" : result.finalScore > -0.5 ? "text-signal-neutral" : "text-signal-bearish";
  const barColor = result.finalScore > 0.5 ? "bg-signal-bullish" : result.finalScore > 0 ? "bg-signal-neutral" : result.finalScore > -0.5 ? "bg-signal-neutral" : "bg-signal-bearish";

  return (
    <div className="rounded-lg border bg-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Composite Macro Score</h2>
          <p className="text-sm text-muted-foreground mt-1">Weighted regime indicator across all signals</p>
        </div>
        <div className={`text-4xl font-mono font-bold ${scoreColor}`}>
          {result.finalScore > 0 ? "+" : ""}{result.finalScore.toFixed(2)}
        </div>
      </div>

      {/* Score bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground font-mono">
          <span>-1.00</span>
          <span>0.00</span>
          <span>+1.00</span>
        </div>
        <div className="relative h-3 rounded-full bg-secondary overflow-hidden">
          {/* Center marker */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-muted-foreground/30 z-10" />
          {/* Score indicator */}
          <div
            className={`absolute top-0 bottom-0 rounded-full ${barColor} transition-all duration-1000 ease-out`}
            style={{
              left: pct < 50 ? `${pct}%` : "50%",
              width: `${Math.abs(pct - 50)}%`,
            }}
          />
          {/* Score dot */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-card ${barColor} shadow-lg z-20 transition-all duration-1000`}
            style={{ left: `calc(${pct}% - 8px)` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Cash Only</span>
          <span>Minimal</span>
          <span>Half</span>
          <span>Full Deploy</span>
        </div>
      </div>

      {/* Regime card */}
      <div className={`rounded-md border p-4 ${regimeBg[result.regime]}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-sm font-semibold ${regimeColors[result.regime]}`}>
              {result.deploymentLabel}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Capital deployment: {result.deploymentPct}%
            </div>
          </div>
          <div className={`text-3xl font-mono font-bold ${regimeColors[result.regime]}`}>
            {result.deploymentPct}%
          </div>
        </div>
        {result.capeDampened && (
          <div className="mt-2 text-xs text-signal-neutral">
            ⚠ CAPE/Shiller PE at 33.2× — maximum deployment capped at 75%
          </div>
        )}
      </div>
    </div>
  );
}
