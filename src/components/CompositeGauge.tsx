import { CompositeResult } from "@/lib/macroSignals";
import { useState } from "react";
import { Info, ChevronDown, ChevronUp } from "lucide-react";

const REGIMES = [
  { label: "Crisis", range: [-1.0, -0.7], color: "hsl(var(--signal-bearish))" },
  { label: "Risk-Off", range: [-0.7, -0.3], color: "hsl(var(--signal-bearish) / 0.7)" },
  { label: "Defensive", range: [-0.3, 0.0], color: "hsl(var(--signal-neutral) / 0.7)" },
  { label: "Cautious", range: [0.0, 0.3], color: "hsl(var(--signal-neutral))" },
  { label: "Mod Bull", range: [0.3, 0.7], color: "hsl(var(--signal-bullish) / 0.7)" },
  { label: "Risk-On", range: [0.7, 1.0], color: "hsl(var(--signal-bullish))" },
];

const DEPLOYMENT_TIERS = [
  { pct: 100, label: "Fully Deployed", threshold: "> 0.50", description: "Strong macro tailwinds across most signals. Full equity exposure." },
  { pct: 50, label: "Half Deployed", threshold: "0.00 to 0.50", description: "Mixed but net-positive conditions. Reduce risk, keep core positions." },
  { pct: 25, label: "Minimal Exposure", threshold: "−0.50 to 0.00", description: "Macro headwinds building. Defensive positioning, preserve capital." },
  { pct: 0, label: "Cash Only", threshold: "< −0.50", description: "Broad deterioration across signals. Capital preservation mode." },
];

// ... keep existing code (describeArc function)

function CompositeExplainer() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="How the composite score works"
      >
        <Info className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute left-0 top-7 z-50 w-80 rounded-lg border bg-card p-4 shadow-lg space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p className="text-foreground font-medium text-sm">How it works</p>
          <p>
            The composite score aggregates <span className="text-foreground font-medium">20 macro signals</span> — spanning leading indicators, coincident data, and market sentiment — into a single number from <span className="font-mono">−1.00</span> to <span className="font-mono">+1.00</span>.
          </p>
          <p>
            Each signal is scored continuously between −1 and +1, then multiplied by its category weight. The raw weighted sum is normalized by the maximum possible score (<span className="font-mono">35.5</span>).
          </p>
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {REGIMES.map((regime) => (
              <div key={regime.label} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: regime.color }} />
                <span className="font-mono text-[10px]">{regime.range[0].toFixed(1)} to {regime.range[1].toFixed(1)}</span>
                <span className="text-[10px]">{regime.label}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] italic pt-1">
            The gauge needle and regime label update in real time as underlying data changes.
          </p>
        </div>
      )}
    </div>
  );
}

function DeploymentLegend({ capeDampened }: { capeDampened: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-border pt-3 mt-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <Info className="h-3.5 w-3.5" />
        <span>How deployment is calculated</span>
        {open ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
      </button>
      {open && (
        <div className="mt-3 space-y-3 text-xs text-muted-foreground leading-relaxed">
          <p>
            The <span className="text-foreground font-medium">composite macro score</span> (−1 to +1) is computed from 20 weighted signals across leading, coincident, and sentiment categories. The score maps to a capital deployment tier:
          </p>
          <div className="grid gap-2">
            {DEPLOYMENT_TIERS.map((tier) => (
              <div key={tier.pct} className="rounded-lg bg-muted/40 border border-border p-2.5 flex items-start gap-3">
                <span className={`text-base font-mono font-bold shrink-0 w-12 text-right ${
                  tier.pct === 100 ? "text-signal-bullish" :
                  tier.pct >= 25 ? "text-signal-neutral" :
                  "text-signal-bearish"
                }`}>
                  {tier.pct}%
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-medium text-[11px]">{tier.label}</span>
                    <span className="text-[10px] font-mono text-muted-foreground/70">Score {tier.threshold}</span>
                  </div>
                  <p className="text-[11px] mt-0.5">{tier.description}</p>
                </div>
              </div>
            ))}
          </div>
          {capeDampened && (
            <div className="rounded-lg bg-signal-neutral/10 border border-signal-neutral/30 p-2.5">
              <p className="text-[11px]">
                <span className="text-signal-neutral font-medium">CAPE Override:</span> When the Shiller PE ratio exceeds 30×, maximum deployment is capped at 75% regardless of the composite score — reflecting elevated valuation risk.
              </p>
            </div>
          )}
          <p className="text-[10px] italic">
            This is a framework suggestion, not a trade signal. It translates the macro backdrop into a simple allocation posture.
          </p>
        </div>
      )}
    </div>
  );
}

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
  const startDeg = 180;
  const endDeg = 360;
  const totalArc = endDeg - startDeg;

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
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">Composite Macro Score</h2>
            <CompositeExplainer />
          </div>
          <p className="text-sm text-muted-foreground mt-1">Weighted regime indicator across all signals</p>
        </div>
        <div className={`text-4xl font-mono font-bold ${scoreColor}`}>
          {result.finalScore > 0 ? "+" : ""}{result.finalScore.toFixed(2)}
        </div>
      </div>

      <div className="flex justify-center">
        <svg viewBox="0 0 400 210" className="w-full max-w-md">
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

          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" className="transition-all duration-1000 ease-out" />
          <circle cx={cx} cy={cy} r="6" fill="hsl(var(--foreground))" />
          <circle cx={cx} cy={cy} r="3" fill="hsl(var(--card))" />

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
            ⚠ CAPE/Shiller PE elevated — maximum deployment capped at 75%
          </div>
        )}
      </div>

      {/* Deployment Legend */}
      <DeploymentLegend capeDampened={result.capeDampened} />
    </div>
  );
}
