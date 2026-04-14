import { CompositeResult, MacroSignal } from "@/lib/macroSignals";
import { RegimeRadar } from "@/components/RegimeRadar";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

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
  const [expanded, setExpanded] = useState(false);
  const activeIdx = REGIMES.findIndex(
    (r) => result.finalScore >= r.scoreRange[0] && result.finalScore <= r.scoreRange[1]
  );

  return (
    <div className="rounded-lg border bg-card p-6 space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Portfolio Response</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Composite score mapped to macro, volatility, trend, liquidity & rate regimes
            </p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Toggle explainer"
          >
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
        <div className={`overflow-hidden transition-all duration-300 ${expanded ? "max-h-[500px] mt-3" : "max-h-0"}`}>
          <div className="border-t border-border/30 pt-3 space-y-2 text-xs text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">What is the Regime Map?</span>{" "}
              The regime map translates the composite macro score (−1 to +1) into one of six market regimes, 
              each describing the overall environment across five dimensions: macro momentum, volatility, trend, 
              liquidity, and rates/dollar.
            </p>
            <p>
              <span className="font-semibold text-foreground">How is the score calculated?</span>{" "}
              Each of the 13 macro signals is scored as bullish (+1), neutral (0), or bearish (−1), then 
              weighted by importance. High-impact signals like yield curve, credit spreads, breadth, and 
              liquidity carry 2× weight; moderate signals carry 1×; sentiment and seasonality carry 0.5×. 
              The weighted sum is normalized to a −1 to +1 range.
            </p>
            <p>
              <span className="font-semibold text-foreground">How to read the spectrum bar?</span>{" "}
              The vertical marker shows where the current score falls. The highlighted regime card below 
              describes the current environment and suggests positioning. Inactive regime cards show 
              what other environments look like for reference.
            </p>
            <p>
              <span className="font-semibold text-foreground">What does the radar chart show?</span>{" "}
              The five-axis radar groups signals into independent dimensions — Macro Momentum (Yield Curve, CFNAI, 
              Earnings), Volatility (VIX), Trend (Breadth, Seasonality), Liquidity (M2, NFCI, Credit Spreads), 
              and Rates/Dollar (DXY, Oil). This reveals which dimensions are strong vs weak, even when the 
              overall score looks neutral.
            </p>
          </div>
        </div>
      </div>

      {/* Spectrum bar */}
      <div className="space-y-1">
        <div className="relative h-12 rounded-lg overflow-hidden flex mt-6">
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
                <span className={`text-sm font-mono font-bold text-primary-foreground truncate px-1 drop-shadow-[0_0_6px_rgba(255,255,255,0.5)] ${isActive ? "drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" : "opacity-60"}`}>
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
