import { MacroSignal, SignalScore } from "@/lib/macroSignals";
import { TrendingUp, Minus, TrendingDown } from "lucide-react";

const scoreConfig: Record<SignalScore, { icon: typeof TrendingUp; label: string; colorClass: string; bgClass: string; borderClass: string }> = {
  1: { icon: TrendingUp, label: "Bullish", colorClass: "text-signal-bullish", bgClass: "bg-signal-bullish/10", borderClass: "border-signal-bullish/30" },
  0: { icon: Minus, label: "Neutral", colorClass: "text-signal-neutral", bgClass: "bg-signal-neutral/10", borderClass: "border-signal-neutral/30" },
  [-1]: { icon: TrendingDown, label: "Bearish", colorClass: "text-signal-bearish", bgClass: "bg-signal-bearish/10", borderClass: "border-signal-bearish/30" },
};

export function SignalCard({ signal }: { signal: MacroSignal }) {
  const config = scoreConfig[signal.score];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border bg-card p-4 space-y-3 transition-all hover:border-muted-foreground/20`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground truncate">{signal.name}</h3>
            <span className="text-xs text-muted-foreground font-mono shrink-0">{signal.weight}×</span>
          </div>
          <div className={`text-xl font-mono font-bold mt-1 ${config.colorClass}`}>
            {signal.value}
          </div>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bgClass} ${config.colorClass} border ${config.borderClass}`}>
          <Icon className="h-3 w-3" />
          {config.label}
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{signal.description}</p>

      <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
        <div className={`rounded px-1.5 py-1 text-center ${signal.score === 1 ? "bg-signal-bullish/10 text-signal-bullish border border-signal-bullish/30" : "bg-secondary text-muted-foreground"}`}>
          +1 {signal.bullishCondition}
        </div>
        <div className={`rounded px-1.5 py-1 text-center ${signal.score === 0 ? "bg-signal-neutral/10 text-signal-neutral border border-signal-neutral/30" : "bg-secondary text-muted-foreground"}`}>
          0 {signal.neutralCondition}
        </div>
        <div className={`rounded px-1.5 py-1 text-center ${signal.score === -1 ? "bg-signal-bearish/10 text-signal-bearish border border-signal-bearish/30" : "bg-secondary text-muted-foreground"}`}>
          -1 {signal.bearishCondition}
        </div>
      </div>
    </div>
  );
}
