import { MacroSignal, CompositeResult } from "@/lib/macroSignals";

export function ScoreBreakdown({ signals, result }: { signals: MacroSignal[]; result: CompositeResult }) {
  const maxWeighted = 2; // max possible single weighted contribution

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Score Breakdown</h2>
      <div className="space-y-1.5">
        {signals.map((s) => {
          const weighted = s.score * s.weight;
          const barPct = Math.abs(weighted / maxWeighted) * 50; // max 50% width each side
          const isPositive = weighted > 0;
          const isNegative = weighted < 0;

          return (
            <div key={s.id} className="space-y-0.5">
              <div className="flex items-center gap-3 text-xs font-mono py-0.5">
                <span className="text-muted-foreground w-36 truncate">{s.name}</span>
                <span className={`w-8 text-right ${s.score > 0 ? "text-signal-bullish" : s.score < 0 ? "text-signal-bearish" : "text-signal-neutral"}`}>
                  {s.score > 0 ? "+" : ""}{s.score}
                </span>
                <span className="text-muted-foreground">×</span>
                <span className="text-muted-foreground w-6">{s.weight}</span>
                <span className="text-muted-foreground">=</span>
                <span className={`w-8 text-right font-semibold ${weighted > 0 ? "text-signal-bullish" : weighted < 0 ? "text-signal-bearish" : "text-signal-neutral"}`}>
                  {weighted > 0 ? "+" : ""}{weighted}
                </span>
              </div>
              {/* Bidirectional bar */}
              <div className="relative h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-muted-foreground/20" />
                {(isPositive || isNegative) && (
                  <div
                    className={`absolute top-0 bottom-0 rounded-full transition-all duration-700 ${
                      isPositive ? "bg-signal-bullish" : "bg-signal-bearish"
                    }`}
                    style={{
                      left: isPositive ? "50%" : `${50 - barPct}%`,
                      width: `${barPct}%`,
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-border pt-3 flex items-center justify-between text-sm font-mono">
        <span className="text-muted-foreground">
          Raw: {result.rawScore > 0 ? "+" : ""}{result.rawScore} / 16 possible
        </span>
        <span className={`font-bold ${result.finalScore > 0 ? "text-signal-bullish" : result.finalScore < 0 ? "text-signal-bearish" : "text-signal-neutral"}`}>
          Normalized: {result.finalScore > 0 ? "+" : ""}{result.finalScore.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
