import { MacroSignal, computeRegimeDimensions } from "@/lib/macroSignals";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";

interface Props {
  signals: MacroSignal[];
}

export function RegimeRadar({ signals }: Props) {
  const dimensions = computeRegimeDimensions(signals);

  const data = dimensions.map((d) => ({
    dimension: d.label,
    score: d.score,
    // Shift -1..+1 to 0..1 for radar
    value: (d.score + 1) / 2,
    fullMark: 1,
  }));

  return (
    <div className="rounded-lg border bg-card p-6 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Regime Radar</h2>
        <p className="text-xs text-muted-foreground">5 independent regime dimensions (center = bearish, outer = bullish)</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="dimension"
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
      <div className="flex flex-wrap justify-center gap-3 text-[10px] font-mono text-muted-foreground">
        {data.map((d) => (
          <span
            key={d.dimension}
            className={d.score > 0 ? "text-signal-bullish" : d.score < 0 ? "text-signal-bearish" : "text-signal-neutral"}
          >
            {d.dimension}: {d.score > 0 ? "+" : ""}{d.score.toFixed(2)}
          </span>
        ))}
      </div>
    </div>
  );
}
