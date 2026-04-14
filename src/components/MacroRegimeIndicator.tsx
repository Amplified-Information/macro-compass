import { MacroSignal } from "@/lib/macroSignals";

type RegimeType = "goldilocks" | "reflation" | "stagflation" | "deflation";

interface MacroRegime {
  id: RegimeType;
  label: string;
  growthDir: "up" | "down";
  inflationDir: "up" | "down";
  description: string;
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

function detectRegime(signals: MacroSignal[]): RegimeType {
  const byId = Object.fromEntries(signals.map((s) => [s.id, s]));

  // Growth: yield curve + CFNAI + earnings
  const growthScores = ["yield-curve", "pmi", "earnings"].map((id) => byId[id]?.score ?? 0);
  const growthAvg = growthScores.reduce((a, b) => a + b, 0) / growthScores.length;

  // Inflation: inflation pass-through + oil (inverted — negative score = rising inflation)
  const inflationScores = ["inflation", "oil"].map((id) => byId[id]?.score ?? 0);
  const inflationAvg = inflationScores.reduce((a, b) => a + b, 0) / inflationScores.length;

  const growthUp = growthAvg >= 0;
  // Negative inflation score means inflation is rising
  const inflationUp = inflationAvg < 0;

  if (growthUp && !inflationUp) return "goldilocks";
  if (growthUp && inflationUp) return "reflation";
  if (!growthUp && inflationUp) return "stagflation";
  return "deflation";
}

export function MacroRegimeIndicator({ signals }: { signals: MacroSignal[] }) {
  const activeRegime = detectRegime(signals);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Macro Regime
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {REGIMES.map((regime) => {
          const isActive = regime.id === activeRegime;
          const colors = REGIME_COLORS[regime.id];

          return (
            <div
              key={regime.id}
              className={`rounded-xl border p-4 space-y-2 transition-all ${
                isActive
                  ? `${colors.bg} ${colors.border} ring-1 ${colors.border}`
                  : "bg-card border-border opacity-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${colors.dot} ${
                    isActive ? "animate-pulse-glow" : "opacity-40"
                  }`}
                />
                <span
                  className={`text-sm font-semibold ${
                    isActive ? colors.active : "text-muted-foreground"
                  }`}
                >
                  {regime.label}
                </span>
              </div>

              <div className="flex gap-3 text-[10px] font-mono">
                <span className={isActive ? "text-foreground" : "text-muted-foreground"}>
                  Growth {regime.growthDir === "up" ? "↑" : "↓"}
                </span>
                <span className={isActive ? "text-foreground" : "text-muted-foreground"}>
                  Inflation {regime.inflationDir === "up" ? "↑" : "↓"}
                </span>
              </div>

              <p
                className={`text-[11px] leading-relaxed ${
                  isActive ? "text-secondary-foreground" : "text-muted-foreground"
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
