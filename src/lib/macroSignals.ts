export type SignalScore = -1 | 0 | 1;
export type SignalCategory = "leading" | "coincident" | "sentiment";
export type RegimeLevel = "full" | "half" | "minimal" | "cash";

export interface MacroSignal {
  id: string;
  name: string;
  category: SignalCategory;
  weight: number;
  score: SignalScore;
  value: string;
  description: string;
  bullishCondition: string;
  neutralCondition: string;
  bearishCondition: string;
}

export interface CompositeResult {
  rawScore: number;
  normalizedScore: number;
  capeDampened: boolean;
  finalScore: number;
  regime: RegimeLevel;
  deploymentPct: number;
  deploymentLabel: string;
}

const CATEGORY_WEIGHTS: Record<SignalCategory, number> = {
  leading: 2,
  coincident: 1,
  sentiment: 0.5,
};

export function getRegime(score: number): { regime: RegimeLevel; deploymentPct: number; deploymentLabel: string } {
  if (score > 0.5) return { regime: "full", deploymentPct: 100, deploymentLabel: "Fully Deployed" };
  if (score > 0) return { regime: "half", deploymentPct: 50, deploymentLabel: "Half Deployed" };
  if (score > -0.5) return { regime: "minimal", deploymentPct: 25, deploymentLabel: "Minimal Exposure" };
  return { regime: "cash", deploymentPct: 0, deploymentLabel: "Cash Only" };
}

export function computeComposite(signals: MacroSignal[], capeElevated: boolean): CompositeResult {
  const totalPossible = signals.reduce((sum, s) => sum + s.weight, 0);
  const rawScore = signals.reduce((sum, s) => sum + s.score * s.weight, 0);
  let normalizedScore = totalPossible > 0 ? rawScore / totalPossible : 0;
  normalizedScore = Math.max(-1, Math.min(1, normalizedScore));

  let finalScore = normalizedScore;
  let capeDampened = false;

  if (capeElevated && finalScore > 0) {
    // Cap deployment at 75%
    const cappedRegime = getRegime(finalScore);
    if (cappedRegime.deploymentPct > 75) {
      capeDampened = true;
    }
  }

  const { regime, deploymentPct, deploymentLabel } = getRegime(finalScore);

  return {
    rawScore,
    normalizedScore,
    capeDampened,
    finalScore,
    regime,
    deploymentPct: capeDampened ? Math.min(deploymentPct, 75) : deploymentPct,
    deploymentLabel: capeDampened ? "Capped at 75% (CAPE)" : deploymentLabel,
  };
}

export function getMockSignals(): MacroSignal[] {
  return [
    // Leading (2x weight)
    {
      id: "yield-curve",
      name: "Yield Curve (2s10s)",
      category: "leading",
      weight: 2,
      score: 0,
      value: "+0.12%",
      description: "Spread recently uninverted, currently flat. Watch for steepening confirmation.",
      bullishCondition: "Positive & steepening",
      neutralCondition: "Flat",
      bearishCondition: "Inverted",
    },
    {
      id: "credit-spreads",
      name: "Credit Spreads (HY)",
      category: "leading",
      weight: 2,
      score: 1,
      value: "325 bps",
      description: "High-yield spreads are tight and compressing. Risk appetite is healthy.",
      bullishCondition: "Tight & tightening",
      neutralCondition: "Neutral range",
      bearishCondition: "Wide & widening",
    },
    {
      id: "breadth",
      name: "Market Breadth",
      category: "leading",
      weight: 2,
      score: 1,
      value: "68%",
      description: "68% of S&P 500 stocks above 200-day MA. Broad participation in rally.",
      bullishCondition: "> 60% above 200d MA",
      neutralCondition: "40–60%",
      bearishCondition: "< 40%",
    },
    {
      id: "insider",
      name: "Insider Activity",
      category: "leading",
      weight: 2,
      score: 0,
      value: "0.8 ratio",
      description: "Buy/sell ratio near neutral. No strong directional signal from insiders.",
      bullishCondition: "Net buying",
      neutralCondition: "Mixed",
      bearishCondition: "Net selling",
    },
    {
      id: "m2",
      name: "Money Supply (M2)",
      category: "leading",
      weight: 2,
      score: 1,
      value: "+3.2% YoY",
      description: "M2 growth turning positive. Liquidity conditions improving.",
      bullishCondition: "Expanding",
      neutralCondition: "Flat",
      bearishCondition: "Contracting",
    },

    // Coincident (1x weight)
    {
      id: "vix",
      name: "VIX",
      category: "coincident",
      weight: 1,
      score: 1,
      value: "13.8",
      description: "Volatility is suppressed. Favourable for trend-following and breakouts.",
      bullishCondition: "< 15",
      neutralCondition: "15–25",
      bearishCondition: "> 25",
    },
    {
      id: "pmi",
      name: "PMI (ISM Mfg)",
      category: "coincident",
      weight: 1,
      score: 0,
      value: "50.3",
      description: "Manufacturing barely expansionary. Services sector stronger at 53.1.",
      bullishCondition: "> 52",
      neutralCondition: "48–52",
      bearishCondition: "< 48",
    },
    {
      id: "dxy",
      name: "Dollar (DXY)",
      category: "coincident",
      weight: 1,
      score: 0,
      value: "104.2",
      description: "Dollar holding steady. No strong directional move.",
      bullishCondition: "Weakening",
      neutralCondition: "Stable",
      bearishCondition: "Strengthening",
    },
    {
      id: "oil",
      name: "Oil (WTI)",
      category: "coincident",
      weight: 1,
      score: 1,
      value: "$72.40",
      description: "Oil stable in range. No supply shock pressure on equities.",
      bullishCondition: "Stable",
      neutralCondition: "Moderate move",
      bearishCondition: "Spiking",
    },
    {
      id: "earnings",
      name: "Earnings Revisions",
      category: "coincident",
      weight: 1,
      score: 1,
      value: "+2.1% net",
      description: "Analysts broadly upgrading forward estimates. Corporate health improving.",
      bullishCondition: "Net upgrades",
      neutralCondition: "Mixed",
      bearishCondition: "Net downgrades",
    },

    // Sentiment (0.5x weight)
    {
      id: "sentiment",
      name: "AAII Sentiment",
      category: "sentiment",
      weight: 0.5,
      score: 0,
      value: "38% bull",
      description: "Sentiment neutral. Neither extreme fear nor extreme greed present.",
      bullishCondition: "Extreme fear (contrarian)",
      neutralCondition: "Neutral",
      bearishCondition: "Extreme greed (contrarian)",
    },
    {
      id: "seasonality",
      name: "Seasonality",
      category: "sentiment",
      weight: 0.5,
      score: 1,
      value: "Apr–May",
      description: "Currently in historically favourable seasonal window.",
      bullishCondition: "Nov–Apr",
      neutralCondition: "Transitional",
      bearishCondition: "Sep–Oct",
    },
  ];
}

export const CAPE_VALUE = 33.2;
export const CAPE_ELEVATED = CAPE_VALUE > 30;
