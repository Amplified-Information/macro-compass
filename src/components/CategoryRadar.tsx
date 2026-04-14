import { MacroSignal, SignalCategory } from "@/lib/macroSignals";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  signals: MacroSignal[];
}

const CATEGORIES: SignalCategory[] = ["leading", "coincident", "sentiment"];
const LABELS: Record<SignalCategory, string> = {
  leading: "Leading (2×)",
  coincident: "Coincident (1×)",
  sentiment: "Sentiment (0.5×)",
};

function getCategoryScore(signals: MacroSignal[], cat: SignalCategory): number {
  const catSignals = signals.filter((s) => s.category === cat);
  if (catSignals.length === 0) return 0;
  const sum = catSignals.reduce((a, s) => a + s.score, 0);
  return sum / catSignals.length; // -1 to +1
}

export function CategoryRadar({ signals }: Props) {
  const data = CATEGORIES.map((cat) => ({
    category: LABELS[cat],
    score: getCategoryScore(signals, cat),
    // Radar needs positive values, shift from -1..+1 to 0..1
    value: (getCategoryScore(signals, cat) + 1) / 2,
    fullMark: 1,
  }));

  return (
    <div className="rounded-lg border bg-card p-6 space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-foreground">Signal Balance</h2>
          <p className="text-xs text-muted-foreground">Category sub-scores (center = bearish, outer = bullish)</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground cursor-help shrink-0 mt-0.5" />
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs text-xs leading-relaxed space-y-2">
            <p className="font-semibold">How to read this chart</p>
            <p>Each axis shows the average score of signals in that category. The multiplier (2×, 1×, 0.5×) reflects the weight each category carries in the composite score.</p>
            <ul className="list-disc pl-3 space-y-1">
              <li><span className="text-signal-bullish font-medium">Leading (2×)</span> — forward-looking indicators like yield curve, credit spreads, M2, NFCI</li>
              <li><span className="text-signal-coincident font-medium">Coincident (1×)</span> — real-time measures like VIX, CFNAI, DXY, oil, EPS trends, CAD/USD</li>
              <li><span className="text-signal-bearish font-medium">Sentiment (0.5×)</span> — survey-based gauges like consumer sentiment, seasonality</li>
            </ul>
            <p>A balanced triangle means all categories agree. A skewed shape highlights divergence — e.g. leading indicators turning while sentiment lags.</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          />
          <Radar
            dataKey="value"
            stroke="hsl(var(--signal-bullish))"
            fill="hsl(var(--signal-bullish))"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 text-[10px] font-mono text-muted-foreground">
        {data.map((d) => (
          <span key={d.category} className={d.score > 0 ? "text-signal-bullish" : d.score < 0 ? "text-signal-bearish" : "text-signal-neutral"}>
            {d.category.split(" ")[0]}: {d.score > 0 ? "+" : ""}{d.score.toFixed(2)}
          </span>
        ))}
      </div>
    </div>
  );
}
