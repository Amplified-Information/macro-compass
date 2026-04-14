import { MacroSignal, SignalScore } from "@/lib/macroSignals";
import { TrendingUp, Minus, TrendingDown, Info } from "lucide-react";
import { SignalSparkline } from "./SignalSparkline";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const scoreConfig: Record<SignalScore, { icon: typeof TrendingUp; label: string; colorClass: string; bgClass: string; borderClass: string }> = {
  1: { icon: TrendingUp, label: "Bullish", colorClass: "text-signal-bullish", bgClass: "bg-signal-bullish/10", borderClass: "border-signal-bullish/30" },
  0: { icon: Minus, label: "Neutral", colorClass: "text-signal-neutral", bgClass: "bg-signal-neutral/10", borderClass: "border-signal-neutral/30" },
  [-1]: { icon: TrendingDown, label: "Bearish", colorClass: "text-signal-bearish", bgClass: "bg-signal-bearish/10", borderClass: "border-signal-bearish/30" },
};

function ThresholdPill({ score }: { score: SignalScore }) {
  const position = ((score + 1) / 2) * 100;

  return (
    <div className="relative h-2 rounded-full overflow-hidden flex mt-2">
      <div className="flex-1 bg-signal-bearish/20 rounded-l-full" />
      <div className="flex-1 bg-signal-neutral/20" />
      <div className="flex-1 bg-signal-bullish/20 rounded-r-full" />
      <div
        className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-card shadow-md transition-all duration-500 ${
          score === 1 ? "bg-signal-bullish" : score === -1 ? "bg-signal-bearish" : "bg-signal-neutral"
        }`}
        style={{ left: `calc(${position}% - 6px)` }}
      />
    </div>
  );
}

export function SignalCard({ signal, scoreHistory }: { signal: MacroSignal; scoreHistory?: number[] }) {
  // Quantize to nearest valid key to prevent undefined lookup crash
  const quantized: SignalScore = signal.score >= 0.5 ? 1 : signal.score <= -0.5 ? -1 : 0;
  const config = scoreConfig[quantized];
  const Icon = config.icon;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3 transition-all hover:border-muted-foreground/20">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-foreground">{signal.name}</h3>
          {signal.tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                <p>{signal.tooltip}</p>
                {signal.source && (
                  <p className="mt-1.5 text-muted-foreground font-mono text-[10px]">
                    Source: {signal.source}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground font-mono">{signal.weight}×</span>
          <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bgClass} ${config.colorClass} border ${config.borderClass}`}>
            <Icon className="h-3 w-3" />
            {config.label}
          </div>
        </div>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className={`text-xl font-mono font-bold ${config.colorClass}`}>
          {signal.value}
        </div>
        {scoreHistory && scoreHistory.length >= 2 && (
          <SignalSparkline scores={scoreHistory} />
        )}
      </div>

      <ThresholdPill score={signal.score} />

      <p className="text-xs text-muted-foreground leading-relaxed">{signal.description}</p>

      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground/60">
        {signal.source && <span>📡 {signal.source}</span>}
        {signal.asOf && (
          <span className="text-muted-foreground/50">
            as of {new Date(signal.asOf + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>

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