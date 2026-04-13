import { MacroSignal, computeRegimeDimensions } from "@/lib/macroSignals";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";

interface Props {
  signals: MacroSignal[];
}

interface DimensionData {
  dimension: string;
  score: number;
  value: number;
  fullMark: number;
  tooltip: string;
}

function CustomAxisTick({ x, y, payload, data }: any) {
  const item = data.find((d: DimensionData) => d.dimension === payload.value);

  return (
    <g transform={`translate(${x},${y})`}>
      <title>{item?.tooltip ?? ""}</title>
      <text
        textAnchor="middle"
        fill="hsl(var(--muted-foreground))"
        fontSize={10}
        dy={4}
        style={{ cursor: "help" }}
      >
        {payload.value}
      </text>
    </g>
  );
}

export function RegimeRadar({ signals }: Props) {
  const dimensions = computeRegimeDimensions(signals);

  const data: DimensionData[] = dimensions.map((d) => ({
    dimension: d.label,
    score: d.score,
    value: (d.score + 1) / 2,
    fullMark: 1,
    tooltip: d.tooltip,
  }));

  return (
    <div className="rounded-lg border bg-card p-6 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Regime Radar</h2>
        <p className="text-xs text-muted-foreground">5 independent regime dimensions (center = bearish, outer = bullish). Hover labels for definitions.</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={<CustomAxisTick data={data} />}
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
