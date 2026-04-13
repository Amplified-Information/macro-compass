import { MacroSignal, CompositeResult } from "@/lib/macroSignals";

export function ScoreBreakdown({ signals, result }: { signals: MacroSignal[]; result: CompositeResult }) {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Score Breakdown</h2>
      <div className="space-y-1">
        {signals.map((s) => {
          const weighted = s.score * s.weight;
          return (
            <div key={s.id} className="flex items-center gap-3 text-xs font-mono py-1.5 border-b border-border/50 last:border-0">
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
