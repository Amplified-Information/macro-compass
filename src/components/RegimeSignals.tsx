import { MacroSignal } from "@/lib/macroSignals";

interface RegimeSignalCard {
  label: string;
  status: string;
  color: "bullish" | "bearish" | "neutral";
  explainer: string;
}

function deriveRegimeSignals(signals: MacroSignal[]): RegimeSignalCard[] {
  const byId = Object.fromEntries(signals.map((s) => [s.id, s]));

  // Inflation pressure: inflation pass-through + oil momentum
  const inflationScore = (byId["inflation"]?.score ?? 0) + (byId["oil"]?.score ?? 0);
  const inflationCard: RegimeSignalCard = {
    label: "Inflation pressure",
    status: inflationScore <= -1 ? "Rising fast" : inflationScore >= 1 ? "Contained" : "Moderate",
    color: inflationScore <= -1 ? "bearish" : inflationScore >= 1 ? "bullish" : "neutral",
    explainer: inflationScore <= -1
      ? "Oil momentum and breakeven inflation are both elevated — expect CPI pressure in 2–6 months."
      : inflationScore >= 1
      ? "Oil prices are stable and inflation expectations are anchored. No pass-through risk."
      : "Mixed signals — oil or breakevens showing some movement but not yet alarming.",
  };

  // Growth momentum: yield curve + CFNAI + EPS
  const growthSignals = ["yield-curve", "pmi", "earnings", "lei", "jobless-claims"].map((id) => byId[id]?.score ?? 0);
  const growthAvg = growthSignals.reduce((a, b) => a + b, 0) / growthSignals.length;
  const growthCard: RegimeSignalCard = {
    label: "Growth momentum",
    status: growthAvg > 0.3 ? "Accelerating" : growthAvg < -0.3 ? "Contracting" : "Slow / mixed",
    color: growthAvg > 0.3 ? "bullish" : growthAvg < -0.3 ? "bearish" : "neutral",
    explainer: growthAvg > 0.3
      ? "Yield curve, economic activity (CFNAI), and earnings are all pointing to expansion."
      : growthAvg < -0.3
      ? "Multiple growth indicators are deteriorating — recession risk is elevated."
      : "Growth signals are mixed — some improving, others flat or weakening.",
  };

  // Liquidity: M2 + NFCI + credit spreads
  const liqSignals = ["m2", "nfci", "credit-spreads", "ig-spreads"].map((id) => byId[id]?.score ?? 0);
  const liqAvg = liqSignals.reduce((a, b) => a + b, 0) / liqSignals.length;
  const liqCard: RegimeSignalCard = {
    label: "Liquidity",
    status: liqAvg > 0.3 ? "Abundant" : liqAvg < -0.3 ? "Tightening" : "Neutral",
    color: liqAvg > 0.3 ? "bullish" : liqAvg < -0.3 ? "bearish" : "neutral",
    explainer: liqAvg > 0.3
      ? "M2 is expanding, financial conditions are loose, and credit spreads are tight — ample liquidity for risk assets."
      : liqAvg < -0.3
      ? "Money supply contracting, financial conditions tightening, and credit spreads widening — liquidity headwinds."
      : "Liquidity conditions are neither supportive nor restrictive. Watch for directional shift.",
  };

  // Risk appetite: VIX + breadth + insider
  const riskSignals = ["vix", "breadth", "insider"].map((id) => byId[id]?.score ?? 0);
  const riskAvg = riskSignals.reduce((a, b) => a + b, 0) / riskSignals.length;
  const riskCard: RegimeSignalCard = {
    label: "Risk appetite",
    status: riskAvg > 0.3 ? "Risk-on" : riskAvg < -0.3 ? "Risk-off" : "Mixed",
    color: riskAvg > 0.3 ? "bullish" : riskAvg < -0.3 ? "bearish" : "neutral",
    explainer: riskAvg > 0.3
      ? "Low volatility, broad market participation, and insider buying — classic risk-on environment."
      : riskAvg < -0.3
      ? "Elevated VIX, narrow breadth, and insider selling — defensive positioning warranted."
      : "Risk signals are inconclusive — volatility, breadth, and insider activity are sending mixed messages.",
  };

  return [inflationCard, growthCard, liqCard, riskCard];
}

const COLOR_MAP = {
  bullish: "text-signal-bullish",
  bearish: "text-signal-bearish",
  neutral: "text-signal-neutral",
};

export function RegimeSignals({ signals }: { signals: MacroSignal[] }) {
  const cards = deriveRegimeSignals(signals);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Regime Signals</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4 space-y-1.5">
            <div className="text-xs text-muted-foreground">{card.label}</div>
            <div className={`text-sm font-semibold ${COLOR_MAP[card.color]}`}>{card.status}</div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{card.explainer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
