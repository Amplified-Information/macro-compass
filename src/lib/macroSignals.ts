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
  source?: string;
  tooltip?: string;
  asOf?: string;
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
      source: "FRED (T10Y2Y)",
      tooltip: "The 10-Year minus 2-Year Treasury spread. An inverted curve has preceded every US recession since 1970. Steepening after inversion often signals recovery.",
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
      source: "FRED (BAMLH0A0HYM2)",
      tooltip: "ICE BofA High Yield Option-Adjusted Spread. Measures credit risk premium investors demand over Treasuries. Tight spreads = confidence; widening = stress.",
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
      source: "FRED (SP500 vs DJIA)",
      tooltip: "Compares S&P 500 vs DJIA relative performance as a breadth proxy. When the broad S&P outperforms the concentrated Dow, it signals wide market participation.",
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
      source: "SEC EDGAR",
      tooltip: "Aggregated Form 4 filings from SEC EDGAR. Tracks insider buy/sell ratio. Insiders buying their own stock is historically a bullish contrarian signal.",
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
      source: "FRED (M2SL)",
      tooltip: "M2 Money Supply year-over-year growth. Expanding money supply provides liquidity tailwinds for equities. Contraction preceded the 2022 drawdown.",
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
      source: "FRED (VIXCLS)",
      tooltip: "CBOE Volatility Index — measures implied volatility of S&P 500 options over next 30 days. Low VIX = complacency/calm; high VIX = fear/hedging demand.",
    },
    {
      id: "pmi",
      name: "CFNAI",
      category: "coincident",
      weight: 1,
      score: 0,
      value: "0.00",
      description: "Chicago Fed National Activity Index near trend.",
      bullishCondition: "> 0 (above trend)",
      neutralCondition: "0 to −0.7",
      bearishCondition: "< −0.7 (recession)",
      source: "FRED (CFNAI)",
      tooltip: "Chicago Fed National Activity Index — a weighted average of 85 economic indicators covering production, employment, consumption, and sales. Values above 0 indicate above-trend growth; below −0.7 signals recession risk.",
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
      source: "FRED (DTWEXBGS)",
      tooltip: "Trade Weighted US Dollar Index (Broad). A strengthening dollar headwinds emerging-market and multinational earnings; weakening dollar is a tailwind.",
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
      source: "FRED (DCOILWTICO)",
      tooltip: "West Texas Intermediate crude oil spot price. Stable oil supports corporate margins; spikes act as a tax on consumers and compress earnings.",
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
      source: "SEC EDGAR",
      tooltip: "Net earnings revision ratio from SEC 10-Q/10-K filings. Positive revisions indicate improving corporate fundamentals and analyst confidence.",
    },

    // Sentiment (0.5x weight)
    {
      id: "sentiment",
      name: "Consumer Sentiment",
      category: "sentiment",
      weight: 0.5,
      score: 0,
      value: "67.0",
      description: "U. Michigan Consumer Sentiment in neutral range.",
      bullishCondition: "< 60 (contrarian)",
      neutralCondition: "60–100",
      bearishCondition: "> 100 (contrarian)",
      source: "FRED (UMCSENT)",
      tooltip: "University of Michigan Consumer Sentiment Index. Used as a contrarian indicator — extreme pessimism is bullish (fear = opportunity), extreme optimism is a warning.",
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
      source: "Computed",
      tooltip: "Historical seasonal patterns of the S&P 500. 'Sell in May' effect — Nov–Apr has historically outperformed May–Oct by ~4% annually since 1950.",
    },
    {
      id: "nfci",
      name: "Financial Conditions (NFCI)",
      category: "leading",
      weight: 2,
      score: 0,
      value: "-0.12",
      description: "Chicago Fed NFCI near neutral. Financial conditions neither loose nor tight.",
      bullishCondition: "< -0.5 (loose)",
      neutralCondition: "-0.5 to 0",
      bearishCondition: "> 0 (tightening)",
      source: "FRED (NFCI)",
      tooltip: "Chicago Fed National Financial Conditions Index — a composite of 105 measures of credit, leverage, and risk. Negative values indicate loose conditions; positive values signal tightening or stress.",
    },
  ];
}

export interface RegimeDimension {
  label: string;
  score: number;
  signalIds: string[];
  tooltip: string;
}

const REGIME_DIMENSION_MAP: { label: string; signalIds: string[]; tooltip: string }[] = [
  { label: "Macro Momentum", signalIds: ["yield-curve", "pmi", "earnings"], tooltip: "Yield Curve, PMI (CFNAI) & Earnings Revisions — tracks the direction and strength of the economic cycle." },
  { label: "Volatility", signalIds: ["vix"], tooltip: "VIX — measures expected market volatility. Low vol = complacency / risk-on; high vol = fear / risk-off." },
  { label: "Trend", signalIds: ["breadth", "seasonality"], tooltip: "Market Breadth & Seasonality — gauges how broad and persistent the current trend is." },
  { label: "Liquidity", signalIds: ["m2", "nfci", "credit-spreads"], tooltip: "M2 Money Supply, NFCI & Credit Spreads — measures the availability and cost of capital in the financial system." },
  { label: "Rates / Dollar", signalIds: ["dxy", "oil"], tooltip: "Dollar Index & Oil — tracks monetary tightening pressure and input cost headwinds." },
];

export function computeRegimeDimensions(signals: MacroSignal[]): RegimeDimension[] {
  return REGIME_DIMENSION_MAP.map((dim) => {
    const matching = signals.filter((s) => dim.signalIds.includes(s.id));
    const avg = matching.length > 0
      ? matching.reduce((sum, s) => sum + s.score, 0) / matching.length
      : 0;
    return { label: dim.label, score: avg, signalIds: dim.signalIds, tooltip: dim.tooltip };
  });
}

// CAPE defaults (used as fallback when API unavailable)
export const CAPE_DEFAULT = 33.2;
