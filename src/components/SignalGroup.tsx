import { MacroSignal, SignalCategory } from "@/lib/macroSignals";
import { SignalCard } from "./SignalCard";

const categoryMeta: Record<SignalCategory, { title: string; subtitle: string; weightLabel: string }> = {
  leading: { title: "Leading Signals", subtitle: "Position ahead of moves — most predictive", weightLabel: "2× weight" },
  coincident: { title: "Coincident Signals", subtitle: "Real-time economic pulse", weightLabel: "1× weight" },
  sentiment: { title: "Sentiment & Contrarian", subtitle: "Extreme readings are contrarian signals", weightLabel: "0.5× weight" },
};

export function SignalGroup({ category, signals }: { category: SignalCategory; signals: MacroSignal[] }) {
  const meta = categoryMeta[category];
  const groupScore = signals.reduce((s, sig) => s + sig.score, 0);
  const maxScore = signals.length;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">{meta.title}</h2>
          <p className="text-xs text-muted-foreground">{meta.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground">{meta.weightLabel}</span>
          <span className={`text-sm font-mono font-bold ${groupScore > 0 ? "text-signal-bullish" : groupScore < 0 ? "text-signal-bearish" : "text-signal-neutral"}`}>
            {groupScore > 0 ? "+" : ""}{groupScore}/{maxScore}
          </span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {signals.map((signal) => (
          <SignalCard key={signal.id} signal={signal} />
        ))}
      </div>
    </div>
  );
}
