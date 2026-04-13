import { CompositeResult } from "@/lib/macroSignals";

const REGIMES = [
  { label: "Crisis", range: [-1.0, -0.7], color: "hsl(var(--signal-bearish))" },
  { label: "Risk-Off", range: [-0.7, -0.3], color: "hsl(var(--signal-bearish) / 0.7)" },
  { label: "Defensive", range: [-0.3, 0.0], color: "hsl(var(--signal-neutral) / 0.7)" },
  { label: "Cautious", range: [0.0, 0.3], color: "hsl(var(--signal-neutral))" },
  { label: "Mod Bull", range: [0.3, 0.7], color: "hsl(var(--signal-bullish) / 0.7)" },
  { label: "Risk-On", range: [0.7, 1.0], color: "hsl(var(--signal-bullish))" },
];

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const rad = (a: number) => (a * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(startAngle));
  const y1 = cy + r * Math.sin(rad(startAngle));
  const x2 = cx + r * Math.cos(rad(endAngle));
  const y2 = cy + r * Math.sin(rad(endAngle));
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

export function CompositeGauge({ result }: { result: CompositeResult }) {
  const cx = 200, cy = 180, r = 140;
  const startDeg = 180; // left
  const endDeg = 360; // right
  const totalArc = endDeg - startDeg;

  // Map score (-1..+1) to angle
  const scoreAngle = startDeg + ((result.finalScore + 1) / 2) * totalArc;
  const needleLen = r - 15;
  const rad = (scoreAngle * Math.PI) / 180;
  const nx = cx + needleLen * Math.cos(rad);
  const ny = cy + needleLen * Math.sin(rad);

  const scoreColor = result.finalScore > 0.5 ? "text-signal-bullish" : result.finalScore > 0 ? "text-signal-neutral" : result.finalScore > -0.5 ? "text-signal-neutral" : "text-signal-bearish";

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Composite Macro Score</h2>
          <p className="text-sm text-muted-foreground mt-1">Weighted regime indicator across all signals</p>
        </div>
        <div className={`text-4xl font-mono font-bold ${scoreColor}`}>
          {result.finalScore > 0 ? "+" : ""}{result.finalScore.toFixed(2)}
        </div>
      </div>

      <div className="flex justify-center">
        <svg viewBox="0 0 400 210" className="w-full max-w-md">
          {/* Regime arc segments */}
          {REGIMES.map((regime) => {
            const s = startDeg + ((regime.range[0] + 1) / 2) * totalArc;
            const e = startDeg + ((regime.range[1] + 1) / 2) * totalArc;
            const isActive = result.finalScore >= regime.range[0] && result.finalScore <= regime.range[1];
            return (
              <path
                key={regime.label}
                d={describeArc(cx, cy, r, s, e)}
                fill="none"
                stroke={regime.color}
                strokeWidth={isActive ? 20 : 14}
                strokeLinecap="butt"
                opacity={isActive ? 1 : 0.3}
                className="transition-all duration-700"
              />
            );
          })}

          {/* Tick marks and labels */}
          {REGIMES.map((regime) => {
            const mid = startDeg + (((regime.range[0] + regime.range[1]) / 2 + 1) / 2) * totalArc;
            const labelR = r + 22;
            const lx = cx + labelR * Math.cos((mid * Math.PI) / 180);
            const ly = cy + labelR * Math.sin((mid * Math.PI) / 180);
            return (
              <text
                key={regime.label + "-label"}
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground"
                fontSize="8"
                fontFamily="monospace"
              >
                {regime.label}
              </text>
            );
          })}

          {/* Needle */}
          <line
            x1={cx}
            y1={cy}
            x2={nx}
            y2={ny}
            stroke="hsl(var(--foreground))"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
          {/* Needle hub */}
          <circle cx={cx} cy={cy} r="6" fill="hsl(var(--foreground))" />
          <circle cx={cx} cy={cy} r="3" fill="hsl(var(--card))" />

          {/* -1 and +1 labels */}
          <text x={cx - r - 10} y={cy + 14} textAnchor="end" className="fill-muted-foreground" fontSize="10" fontFamily="monospace">-1.00</text>
          <text x={cx + r + 10} y={cy + 14} textAnchor="start" className="fill-muted-foreground" fontSize="10" fontFamily="monospace">+1.00</text>
          <text x={cx} y={cy + 14} textAnchor="middle" className="fill-muted-foreground" fontSize="9" fontFamily="monospace">0.00</text>
        </svg>
      </div>

      {/* Regime card */}
      <div className={`rounded-md border p-4 ${
        result.finalScore > 0.3 ? "bg-signal-bullish/10 border-signal-bullish/30" :
        result.finalScore > -0.3 ? "bg-signal-neutral/10 border-signal-neutral/30" :
        "bg-signal-bearish/10 border-signal-bearish/30"
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-sm font-semibold ${
              result.finalScore > 0.3 ? "text-signal-bullish" :
              result.finalScore > -0.3 ? "text-signal-neutral" :
              "text-signal-bearish"
            }`}>
              {result.deploymentLabel}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Capital deployment: {result.deploymentPct}%
            </div>
          </div>
          <div className={`text-3xl font-mono font-bold ${
            result.finalScore > 0.3 ? "text-signal-bullish" :
            result.finalScore > -0.3 ? "text-signal-neutral" :
            "text-signal-bearish"
          }`}>
            {result.deploymentPct}%
          </div>
        </div>
        {result.capeDampened && (
          <div className="mt-2 text-xs text-signal-neutral">
            ⚠ CAPE/Shiller PE at 33.2× — maximum deployment capped at 75%
          </div>
        )}
      </div>
    </div>
  );
}
