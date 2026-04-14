import { useMemo } from "react";
import { MacroSignal, SignalCategory } from "@/lib/macroSignals";
import { MacroSnapshot } from "@/hooks/useMacroData";
import { SignalCard } from "./SignalCard";

const categoryMeta: Record<SignalCategory, { title: string; subtitle: string; weightLabel: string; borderColor: string }> = {
  leading: { title: "Leading Signals", subtitle: "Position ahead of moves — most predictive", weightLabel: "2× weight", borderColor: "border-l-signal-bullish" },
  coincident: { title: "Coincident Signals", subtitle: "Real-time economic pulse", weightLabel: "1× weight", borderColor: "border-l-signal-neutral" },
  sentiment: { title: "Sentiment & Contrarian", subtitle: "Extreme readings are contrarian signals", weightLabel: "0.5× weight", borderColor: "border-l-muted-foreground" },
};

export function SignalGroup({ category, signals, snapshots }: { category: SignalCategory; signals: MacroSignal[]; snapshots?: MacroSnapshot[] }) {
  const meta = categoryMeta[category];
  const groupScore = signals.reduce((s, sig) => s + sig.score, 0);
  const maxScore = signals.length;
  const normalizedGroup = maxScore > 0 ? groupScore / maxScore : 0;

  // Deduplicate snapshots to one per day (latest per day), limit to 30 days, oldest first
  const dailySnapshots = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return null;
    const byDay = new Map<string, MacroSnapshot>();
    for (const snap of snapshots) {
      const day = snap.created_at.slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, snap); // snapshots are newest-first, so first seen = latest
    }
    return [...byDay.values()].reverse().slice(-30);
  }, [snapshots]);

  return (
    <div className={`space-y-4 border-l-4 pl-4 ${meta.borderColor}`}>
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">{meta.title}</h2>
          <p className="text-xs text-muted-foreground">{meta.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground">{meta.weightLabel}</span>
          <div className="flex items-center gap-2">
            {/* Mini bar showing group direction */}
            <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-muted-foreground/20" />
              {normalizedGroup !== 0 && (
                <div
                  className={`absolute top-0 bottom-0 rounded-full ${normalizedGroup > 0 ? "bg-signal-bullish" : "bg-signal-bearish"}`}
                  style={{
                    left: normalizedGroup > 0 ? "50%" : `${50 + (normalizedGroup * 50)}%`,
                    width: `${Math.abs(normalizedGroup) * 50}%`,
                  }}
                />
              )}
            </div>
            <span className={`text-sm font-mono font-bold ${groupScore > 0 ? "text-signal-bullish" : groupScore < 0 ? "text-signal-bearish" : "text-signal-neutral"}`}>
              {groupScore > 0 ? "+" : ""}{groupScore}/{maxScore}
            </span>
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {signals.map((signal) => {
          return (
            <SignalCard key={signal.id} signal={signal} scoreHistory={dailySnapshots ? dailySnapshots.map((snap) => snap.signals?.[signal.id] ?? 0) : undefined} />
          );
        })}
      </div>
    </div>
  );
}
