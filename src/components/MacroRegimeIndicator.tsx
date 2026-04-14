import { MacroSignal } from "@/lib/macroSignals";
import { Progress } from "@/components/ui/progress";

type RegimeType = "goldilocks" | "reflation" | "stagflation" | "deflation";

interface MacroRegime {
  id: RegimeType;
  label: string;
  growthDir: "up" | "down";
  inflationDir: "up" | "down";
  description: string;
}

interface RegimeDetail {
  primary: RegimeType;
  secondary: RegimeType | null;
  confidence: number;
  growthScore: number;
  inflationScore: number;
  narrative: string;
}

const REGIMES: MacroRegime[] = [
  {
    id: "goldilocks",
    label: "Goldilocks",
    growthDir: "up",
    inflationDir: "down",
    description: "Growth expanding with contained inflation — ideal for risk assets.",
  },
  {
    id: "reflation",
    label: "Reflation",
    growthDir: "up",
    inflationDir: "up",
    description: "Growth and inflation both rising — favour commodities and value.",
  },
  {
    id: "stagflation",
    label: "Stagflation",
    growthDir: "down",
    inflationDir: "up",
    description: "Stalling growth with rising prices — the worst environment for equities.",
  },
  {
    id: "deflation",
    label: "Deflation / Recession",
    growthDir: "down",
    inflationDir: "down",
    description: "Contracting growth and falling prices — cash and long bonds outperform.",
  },
];

const REGIME_COLORS: Record<RegimeType, { active: string; dot: string; border: string; bg: string }> = {
  goldilocks: {
    active: "text-signal-bullish",
    dot: "bg-signal-bullish",
    border: "border-signal-bullish/40",
    bg: "bg-signal-bullish/10",
  },
  reflation: {
    active: "text-signal-neutral",
    dot: "bg-signal-neutral",
    border: "border-signal-neutral/40",
    bg: "bg-signal-neutral/10",
  },
  stagflation: {
    active: "text-signal-bearish",
    dot: "bg-signal-bearish",
    border: "border-signal-bearish/40",
    bg: "bg-signal-bearish/10",
  },
  deflation: {
    active: "text-signal-bearish",
    dot: "bg-signal-bearish",
    border: "border-signal-bearish/40",
    bg: "bg-signal-bearish/10",
  },
};

const TRANSITION_THRESHOLD = 0.15;

function getRegimeFromAxes(growthUp: boolean, inflationUp: boolean): RegimeType {
  if (growthUp && !inflationUp) return "goldilocks";
  if (growthUp && inflationUp) return "reflation";
  if (!growthUp && inflationUp) return "stagflation";
  return "deflation";
}

function getAdjacentRegime(primary: RegimeType, growthScore: number, inflationScore: number): RegimeType | null {
  const growthNearZero = Math.abs(growthScore) < TRANSITION_THRESHOLD;
  const inflationNearZero = Math.abs(inflationScore) < TRANSITION_THRESHOLD;

  if (!growthNearZero && !inflationNearZero) return null;

  // Flip the axis that's closest to zero to find the adjacent regime
  if (growthNearZero && inflationNearZero) {
    // Both near zero — flip the one closer to zero
    if (Math.abs(growthScore) < Math.abs(inflationScore)) {
      return getRegimeFromAxes(growthScore < 0, inflationScore > 0);
    }
    return getRegimeFromAxes(growthScore >= 0, inflationScore <= 0);
  }

  if (growthNearZero) {
    return getRegimeFromAxes(growthScore < 0, inflationScore > 0);
  }

  // inflationNearZero
  return getRegimeFromAxes(growthScore >= 0, inflationScore <= 0);
}

function getPhaseLabel(axisScore: number): string {
  const abs = Math.abs(axisScore);
  if (abs < 0.15) return "late";
  if (abs < 0.4) return "mid";
  return "early";
}

function generateNarrative(
  primary: RegimeType,
  secondary: RegimeType | null,
  growthScore: number,
  inflationScore: number,
  signals: MacroSignal[]
): string {
  const byId = Object.fromEntries(signals.map((s) => [s.id, s]));
  const phase = getPhaseLabel(Math.min(Math.abs(growthScore), Math.abs(inflationScore)));
  const regimeLabel = REGIMES.find((r) => r.id === primary)!.label;

  const parts: string[] = [];

  // Opening
  const phasePrefix = phase === "late" ? "Late" : phase === "mid" ? "Mid-cycle" : "Early";
  parts.push(`${phasePrefix} ${regimeLabel.toLowerCase()}`);

  // Growth descriptor
  if (growthScore > 0.3) parts.push("growth expanding");
  else if (growthScore > 0) parts.push("growth positive but decelerating");
  else if (growthScore > -0.3) parts.push("growth stalling");
  else parts.push("growth contracting");

  // Inflation descriptor
  if (inflationScore > 0.3) parts.push("inflation accelerating sharply");
  else if (inflationScore > 0) parts.push("inflation re-accelerating");
  else if (inflationScore > -0.3) parts.push("inflation contained");
  else parts.push("disinflationary pressure building");

  let narrative = parts[0] + " — " + parts.slice(1).join(", ") + ".";

  // Key driver callouts
  const drivers: string[] = [];
  const oil = byId["oil"];
  if (oil && oil.value) {
    const oilMatch = oil.description?.match(/30d: ([+-][\d.]+%)/);
    if (oilMatch) drivers.push(`Oil ${oilMatch[1]} in 30d`);
  }
  const cfnai = byId["pmi"];
  if (cfnai && cfnai.score === 0) drivers.push("CFNAI near zero");
  else if (cfnai && cfnai.score === -1) drivers.push("CFNAI in recession territory");
  const credit = byId["credit-spreads"];
  if (credit && credit.score === 1) drivers.push("credit spreads still tight");
  else if (credit && credit.score === -1) drivers.push("credit spreads widening");
  const vix = byId["vix"];
  if (vix && vix.score === -1) drivers.push("VIX elevated — stress in real-time");
  else if (vix && vix.score === 1) drivers.push("VIX calm");

  if (drivers.length > 0) {
    narrative += ` ${drivers.join(", ")}.`;
  }

  // Transition warning
  if (secondary) {
    const secLabel = REGIMES.find((r) => r.id === secondary)!.label;
    narrative += ` ${secLabel} risk rising.`;
  }

  return narrative;
}

export function detectRegimeDetail(signals: MacroSignal[]): RegimeDetail {
  const byId = Object.fromEntries(signals.map((s) => [s.id, s]));

  // Growth axis: weighted average of growth-related signals
  const growthSignals = [
    { id: "yield-curve", weight: 2 },
    { id: "pmi", weight: 1.5 },
    { id: "earnings", weight: 1 },
    { id: "credit-spreads", weight: 1.5 },
    { id: "breadth", weight: 1 },
    { id: "insider", weight: 0.5 },
    { id: "lei", weight: 1.5 },
    { id: "jobless-claims", weight: 1.5 },
    { id: "vix", weight: 1.5 },          // Real-time risk
    { id: "nfci", weight: 1 },           // Financial conditions
    { id: "m2", weight: 1 },             // Liquidity → growth fuel
    { id: "cb-liquidity", weight: 1 },   // Central bank liquidity → growth support
    { id: "ig-spreads", weight: 1 },     // IG credit stress → early growth warning
    { id: "cadusd", weight: 0.5 },       // Commodity/risk demand proxy
    { id: "sentiment", weight: 0.5 },    // Consumer demand signal (contrarian)
    { id: "seasonality", weight: 0.25 }, // Calendar effect — low weight
  ];

  let growthWeightedSum = 0;
  let growthTotalWeight = 0;
  for (const g of growthSignals) {
    const sig = byId[g.id];
    if (sig) {
      growthWeightedSum += sig.score * g.weight;
      growthTotalWeight += g.weight;
    }
  }
  const growthScore = growthTotalWeight > 0 ? growthWeightedSum / growthTotalWeight : 0;

  // Inflation axis: broad set of inflation-relevant signals (inverted: negative score = rising inflation)
  const inflationSignals = [
    { id: "inflation", weight: 2 },      // 5y5y breakeven + oil pass-through
    { id: "oil", weight: 1.5 },          // Oil momentum — leading CPI driver
    { id: "real-yield", weight: 1.5 },   // Higher real yields = tighter conditions = disinflationary
    { id: "rate-path", weight: 1.5 },    // Pricing cuts = inflation contained; hikes = pressure
    { id: "dxy", weight: 1 },            // Strong dollar = disinflationary impulse
  ];

  let inflationWeightedSum = 0;
  let inflationTotalWeight = 0;
  for (const i of inflationSignals) {
    const sig = byId[i.id];
    if (sig) {
      // Invert: negative signal score means inflation rising → positive inflationScore
      inflationWeightedSum += -sig.score * i.weight;
      inflationTotalWeight += i.weight;
    }
  }
  const inflationScore = inflationTotalWeight > 0 ? inflationWeightedSum / inflationTotalWeight : 0;

  const growthUp = growthScore >= 0;
  const inflationUp = inflationScore > 0;
  const primary = getRegimeFromAxes(growthUp, inflationUp);
  const secondary = getAdjacentRegime(primary, growthScore, inflationScore);

  // Confidence = how far from the axes boundaries (0 = on boundary, 1 = deep in quadrant)
  const distFromGrowthAxis = Math.abs(growthScore);
  const distFromInflationAxis = Math.abs(inflationScore);
  const minDist = Math.min(distFromGrowthAxis, distFromInflationAxis);
  const confidence = Math.min(1, minDist / 0.5); // 0.5+ away from axis = full confidence

  const narrative = generateNarrative(primary, secondary, growthScore, inflationScore, signals);

  return { primary, secondary, confidence, growthScore, inflationScore, narrative };
}

export function MacroRegimeIndicator({ signals }: { signals: MacroSignal[] }) {
  const detail = detectRegimeDetail(signals);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Macro Regime
      </h3>

      {/* Narrative Banner */}
      <div className="rounded-lg border border-border bg-card/50 px-4 py-3">
        <p className="text-sm text-foreground leading-relaxed">
          {detail.narrative}
        </p>
        <div className="flex items-center gap-4 mt-2 text-[10px] font-mono text-muted-foreground">
          <span>Growth: {detail.growthScore > 0 ? "+" : ""}{detail.growthScore.toFixed(2)}</span>
          <span>Inflation: {detail.inflationScore > 0 ? "+" : ""}{detail.inflationScore.toFixed(2)}</span>
          <span>Confidence: {Math.round(detail.confidence * 100)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {REGIMES.map((regime) => {
          const isPrimary = regime.id === detail.primary;
          const isSecondary = regime.id === detail.secondary;
          const colors = REGIME_COLORS[regime.id];

          return (
            <div
              key={regime.id}
              className={`rounded-xl border p-4 space-y-2 transition-all ${
                isPrimary
                  ? `${colors.bg} ${colors.border} ring-1 ${colors.border}`
                  : isSecondary
                  ? `bg-card border-signal-neutral/30 ring-1 ring-signal-neutral/20`
                  : "bg-card border-border opacity-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    isPrimary ? `${colors.dot} animate-pulse-glow` :
                    isSecondary ? "bg-signal-neutral animate-pulse" :
                    `${colors.dot} opacity-40`
                  }`}
                />
                <span
                  className={`text-sm font-semibold ${
                    isPrimary ? colors.active :
                    isSecondary ? "text-signal-neutral" :
                    "text-muted-foreground"
                  }`}
                >
                  {regime.label}
                </span>
              </div>

              {/* Labels */}
              {isPrimary && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-foreground bg-foreground/10 px-1.5 py-0.5 rounded">
                    Active
                  </span>
                </div>
              )}
              {isSecondary && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-signal-neutral bg-signal-neutral/10 px-1.5 py-0.5 rounded">
                    Tilting toward
                  </span>
                </div>
              )}

              {/* Confidence bar (primary only) */}
              {isPrimary && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground">Confidence</span>
                    <span className="text-[9px] font-mono text-foreground">{Math.round(detail.confidence * 100)}%</span>
                  </div>
                  <Progress
                    value={detail.confidence * 100}
                    className="h-1.5 bg-muted"
                  />
                </div>
              )}

              <div className="flex gap-3 text-[10px] font-mono">
                <span className={isPrimary || isSecondary ? "text-foreground" : "text-muted-foreground"}>
                  Growth {regime.growthDir === "up" ? "↑" : "↓"}
                </span>
                <span className={isPrimary || isSecondary ? "text-foreground" : "text-muted-foreground"}>
                  Inflation {regime.inflationDir === "up" ? "↑" : "↓"}
                </span>
              </div>

              <p
                className={`text-[11px] leading-relaxed ${
                  isPrimary ? "text-secondary-foreground" :
                  isSecondary ? "text-muted-foreground" :
                  "text-muted-foreground"
                }`}
              >
                {regime.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
