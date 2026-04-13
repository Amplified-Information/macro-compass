import { MacroSignal, SignalCategory } from "@/lib/macroSignals";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";

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
      <div>
        <h2 className="text-sm font-semibold text-foreground">Signal Balance</h2>
        <p className="text-xs text-muted-foreground">Category sub-scores (center = bearish, outer = bullish)</p>
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
