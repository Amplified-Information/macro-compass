import { CompositeResult } from "@/lib/macroSignals";

// Simulated historical readings for visual context
const HISTORY = [0.15, 0.22, 0.30, 0.25, 0.38, 0.42, 0.35, 0.45, 0.50, 0.48, 0.52, 0.56];

export function DeploymentSparkline({ result }: { result: CompositeResult }) {
  const data = [...HISTORY, result.finalScore];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const w = 200;
  const h = 40;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });

  const lineColor = result.finalScore > 0 ? "hsl(var(--signal-bullish))" : result.finalScore < 0 ? "hsl(var(--signal-bearish))" : "hsl(var(--signal-neutral))";

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">Score Trend</span>
        <span className="text-[10px] font-mono text-muted-foreground">12 periods</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" preserveAspectRatio="none">
        {/* Area fill */}
        <polygon
          points={`0,${h} ${points.join(" ")} ${w},${h}`}
          fill={lineColor}
          fillOpacity="0.1"
        />
        {/* Line */}
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={lineColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Current dot */}
        <circle
          cx={w}
          cy={h - ((result.finalScore - min) / range) * h}
          r="3"
          fill={lineColor}
        />
      </svg>
      <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
        <span>12 periods ago</span>
        <span>Now: {result.finalScore > 0 ? "+" : ""}{result.finalScore.toFixed(2)}</span>
      </div>
    </div>
  );
}
