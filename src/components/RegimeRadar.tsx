import { MacroSignal, computeRegimeDimensions } from "@/lib/macroSignals";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-foreground">Regime Radar</h2>
          <p className="text-xs text-muted-foreground">5 independent regime dimensions (center = bearish, outer = bullish). Hover labels for definitions.</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground cursor-help shrink-0 mt-0.5" />
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs text-xs leading-relaxed space-y-2">
            <p className="font-semibold">How to read this chart</p>
            <p>Each axis represents a macro dimension — an average of the underlying signal scores mapped to that theme. The filled shape shows the current regime profile at a glance.</p>
            <ul className="list-disc pl-3 space-y-1">
              <li><span className="text-signal-bullish font-medium">Outer ring</span> = all signals bullish (+1)</li>
              <li><span className="text-signal-neutral font-medium">Middle ring</span> = neutral (0)</li>
              <li><span className="text-signal-bearish font-medium">Center</span> = all signals bearish (−1)</li>
            </ul>
            <p>A large, symmetric shape = broad strength. A lopsided shape = divergence between dimensions — watch for lagging areas that could drag the composite score down.</p>
          </TooltipContent>
        </Tooltip>
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
