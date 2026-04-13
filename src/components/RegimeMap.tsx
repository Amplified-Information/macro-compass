import { CompositeResult, MacroSignal } from "@/lib/macroSignals";
import { RegimeRadar } from "@/components/RegimeRadar";

interface RegimeMapping {
  label: string;
  scoreRange: [number, number];
  macro: string;
  volatility: string;
  trend: string;
  liquidity: string;
  rates: string;
  color: "bullish" | "neutral" | "bearish" | "danger";
  description: string;
}

const REGIMES: RegimeMapping[] = [
  {
    label: "Full Risk-On",
    scoreRange: [0.7, 1.0],
    macro: "Bull Market",
    volatility: "Low Volatility",
    trend: "Strong Trend Up",
    liquidity: "High Liquidity",
    rates: "Rate Cutting",
    color: "bullish",
    description: "All engines firing. Broad participation, easy monetary policy, low vol. Deploy aggressively — momentum and breakout strategies thrive.",
  },
  {
    label: "Moderate Bull",
    scoreRange: [0.3, 0.7],
    macro: "Bull / Recovery",
    volatility: "Low–Moderate Vol",
    trend: "Trend Up",
    liquidity: "Adequate",
    rates: "Cutting / Pausing",
    color: "bullish",
    description: "Constructive environment with some caution signals. Lean into trends but size positions moderately and respect stops.",
  },
  {
    label: "Cautious Neutral",
    scoreRange: [0.0, 0.3],
    macro: "Late Cycle / Mixed",
    volatility: "Rising",
    trend: "Choppy / Sideways",
    liquidity: "Tightening",
    rates: "Pausing",
    color: "neutral",
    description: "Conflicting signals. Breadth narrowing or vol rising. Reduce exposure, favour mean reversion over trend following.",
  },
  {
    label: "Defensive",
    scoreRange: [-0.3, 0.0],
    macro: "Slowdown",
    volatility: "Elevated",
    trend: "Weak / Choppy",
    liquidity: "Low",
    rates: "Pausing / Hiking",
    color: "neutral",
    description: "Macro deteriorating. Minimal directional exposure. Tighten stops, reduce position sizes, raise cash allocation.",
  },
  {
    label: "Risk-Off",
    scoreRange: [-0.7, -0.3],
    macro: "Bear / Recession",
    volatility: "High Volatility",
    trend: "Strong Trend Down",
    liquidity: "Stressed",
    rates: "Hiking",
    color: "bearish",
    description: "Widespread weakness. Credit stress, earnings declining, vol elevated. Cash is a position. Only short-selling or hedging strategies viable.",
  },
  {
    label: "Crisis Mode",
    scoreRange: [-1.0, -0.7],
    macro: "Recession / Stagflation",
    volatility: "Vol Spike / Crisis",
    trend: "Crash",
    liquidity: "Frozen",
    rates: "Emergency Response",
    color: "danger",
    description: "Correlations spike to 1, liquidity evaporates, most strategies break down. 100% cash or hedged. Protect capital at all costs.",
  },
];

const colorMap = {
  bullish: {
    bg: "bg-signal-bullish/10",
    border: "border-signal-bullish/30",
    text: "text-signal-bullish",
    dot: "bg-signal-bullish",
    barBg: "bg-signal-bullish",
  },
  neutral: {
    bg: "bg-signal-neutral/10",
    border: "border-signal-neutral/30",
    text: "text-signal-neutral",
    dot: "bg-signal-neutral",
    barBg: "bg-signal-neutral",
  },
  bearish: {
    bg: "bg-signal-bearish/10",
    border: "border-signal-bearish/30",
    text: "text-signal-bearish",
    dot: "bg-signal-bearish",
    barBg: "bg-signal-bearish",
  },
  danger: {
    bg: "bg-signal-bearish/10",
    border: "border-signal-bearish/30",
    text: "text-signal-bearish",
    dot: "bg-signal-bearish",
    barBg: "bg-signal-bearish",
  },
};

function RegimeTag({ label, active }: { label: string; active?: boolean }) {
  return (
    <span className={`inline-block text-[10px] font-mono px-1.5 py-0.5 rounded ${active ? "bg-accent text-foreground" : "bg-secondary text-muted-foreground"}`}>
      {label}
    </span>
  );
}

export function RegimeMap({ result, signals }: { result: CompositeResult; signals: MacroSignal[] }) {
  const activeIdx = REGIMES.findIndex(
    (r) => result.finalScore >= r.scoreRange[0] && result.finalScore <= r.scoreRange[1]
  );

  return (
    <div className="rounded-lg border bg-card p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Regime Map</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Composite score mapped to macro, volatility, trend, liquidity & rate regimes
        </p>
      </div>

      {/* Spectrum bar */}
      <div className="space-y-1">
        <div className="relative h-10 rounded-lg overflow-hidden flex mt-6">
          {REGIMES.slice().reverse().map((regime, i) => {
            const realIdx = REGIMES.length - 1 - i;
            const isActive = realIdx === activeIdx;
            const c = colorMap[regime.color];
            const widthPct = ((regime.scoreRange[1] - regime.scoreRange[0]) / 2) * 100;
            return (
              <div
                key={regime.label}
                className={`relative flex items-center justify-center transition-all ${c.barBg} ${isActive ? "opacity-100 ring-2 ring-foreground/30 z-10" : "opacity-30"}`}
                style={{ width: `${widthPct}%` }}
              >
                <span className={`text-[11px] font-mono font-bold text-primary-foreground truncate px-1 ${isActive ? "" : "opacity-60"}`}>
                  {regime.label}
                </span>
              </div>
            );
          })}
          {/* Score marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-foreground z-20 transition-all duration-700"
            style={{ left: `${((result.finalScore + 1) / 2) * 100}%` }}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-mono font-bold text-foreground whitespace-nowrap bg-card px-1.5 py-0.5 rounded border border-border">
              {result.finalScore > 0 ? "+" : ""}{result.finalScore.toFixed(2)}
            </div>
          </div>
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground font-mono px-1">
          <span>-1.00 Crisis</span>
          <span>0.00 Neutral</span>
          <span>+1.00 Risk-On</span>
        </div>
      </div>

      {/* Regime Radar + Detail cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <RegimeRadar signals={signals} />
        </div>
        <div className="lg:col-span-2 grid gap-3 sm:grid-cols-2">
        {REGIMES.map((regime, idx) => {
          const isActive = idx === activeIdx;
          const c = colorMap[regime.color];
          return (
            <div
              key={regime.label}
              className={`rounded-lg border p-4 space-y-3 transition-all ${
                isActive
                  ? `${c.bg} ${c.border} ring-1 ${c.border}`
                  : "bg-card border-border opacity-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${c.dot} ${isActive ? "animate-pulse-glow" : ""}`} />
                  <span className={`text-sm font-semibold ${isActive ? c.text : "text-muted-foreground"}`}>
                    {regime.label}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {regime.scoreRange[0] > 0 ? "+" : ""}{regime.scoreRange[0].toFixed(1)} to {regime.scoreRange[1] > 0 ? "+" : ""}{regime.scoreRange[1].toFixed(1)}
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                <RegimeTag label={regime.macro} active={isActive} />
                <RegimeTag label={regime.volatility} active={isActive} />
                <RegimeTag label={regime.trend} active={isActive} />
                <RegimeTag label={regime.liquidity} active={isActive} />
                <RegimeTag label={regime.rates} active={isActive} />
              </div>

              <p className={`text-[11px] leading-relaxed ${isActive ? "text-secondary-foreground" : "text-muted-foreground"}`}>
                {regime.description}
              </p>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
