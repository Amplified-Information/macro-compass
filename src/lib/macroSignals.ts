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
      value: "+0.5%",
      description: "Wilshire 5000 outperforming S&P 500 — broad participation across small/mid-caps.",
      bullishCondition: "Wilshire > SP500 (broad)",
      neutralCondition: "In line",
      bearishCondition: "SP500 > Wilshire (narrow)",
      source: "FRED (WILL5000PRFC vs SP500)",
      tooltip: "Compares Wilshire 5000 (total US market ~3,500 stocks) vs S&P 500 (large-cap 500) relative performance. When the broader index outperforms, it signals participation beyond mega-caps.",
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
      category: "leading",
      weight: 2,
      score: 1,
      value: "$72.40",
      description: "Oil stable in range. No supply shock pressure on equities.",
      bullishCondition: "< $85, no run-up",
      neutralCondition: "Moderate move or 8-15% run-up",
      bearishCondition: "> $100 or > 15% run-up",
      source: "FRED (DCOILWTICO)",
      tooltip: "West Texas Intermediate crude oil spot price. Rapid price run-ups are a leading indicator of economic stress — they act as a tax on consumers and compress corporate margins before the effects show in earnings.",
    },
    {
      id: "earnings",
      name: "EPS Trends",
      category: "coincident",
      weight: 1,
      score: 1,
      value: "+2.1% net",
      description: "Large-cap EPS mostly improving quarter-over-quarter.",
      bullishCondition: "> 50% improving",
      neutralCondition: "Mixed",
      bearishCondition: "> 50% declining",
      source: "SEC EDGAR (XBRL)",
      tooltip: "Tracks diluted EPS quarter-over-quarter changes across 20 large-cap companies via SEC XBRL filings. Majority improving = bullish earnings momentum; majority declining = bearish.",
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
    {
      id: "cadusd",
      name: "CAD/USD",
      category: "coincident",
      weight: 1,
      score: 0,
      value: "1.3600",
      description: "Canadian Dollar stable vs USD. No strong directional move.",
      bullishCondition: "CAD strengthening (> 0.5%)",
      neutralCondition: "Stable (±0.5%)",
      bearishCondition: "CAD weakening (> 0.5%)",
      source: "FRED (DEXCAUS)",
      tooltip: "Canada/US exchange rate (CAD per 1 USD). Canada is a major commodity exporter and US trading partner. CAD strength signals global risk appetite and commodity demand; weakness signals risk-off.",
    },
    {
      id: "inflation",
      name: "Inflation Pass-Through",
      category: "leading",
      weight: 2,
      score: 0,
      value: "2.30%",
      description: "5y5y breakeven inflation stable. Oil-to-CPI pass-through contained.",
      bullishCondition: "Breakeven falling & oil calm",
      neutralCondition: "Mixed signals",
      bearishCondition: "Breakeven rising & oil surging",
      source: "FRED (T5YIFR)",
      tooltip: "Combines 5-Year, 5-Year Forward Inflation Expectation Rate with oil price momentum. Oil prices feed into CPI with a 2–6 month lag (~0.35% CPI per 10% oil move). Rising breakevens + oil momentum = inflation headwind.",
    },
    {
      id: "cb-liquidity",
      name: "CB Balance Sheets",
      category: "leading",
      weight: 2,
      score: 0,
      value: "0.000% WoW",
      description: "Fed + BoC combined balance sheet week-over-week change. Tracks QE/QT liquidity flows.",
      bullishCondition: "> +0.1% WoW (QE)",
      neutralCondition: "±0.1% (flat)",
      bearishCondition: "< -0.1% WoW (QT)",
      source: "FRED (WALCL) + BoC Valet (V36610)",
      tooltip: "Tracks combined Fed and Bank of Canada balance sheet changes week-over-week. Expanding balance sheets (QE) inject liquidity into markets — bullish. Contracting (QT) drains liquidity — bearish. The Fed is weighted 85%, BoC 15%.",
    },
    // New high-value signals
    {
      id: "jobless-claims",
      name: "Initial Jobless Claims",
      category: "leading",
      weight: 2,
      score: 0,
      value: "220k",
      description: "Weekly initial claims near historical lows. Labor market remains tight.",
      bullishCondition: "< 225k",
      neutralCondition: "225k–300k",
      bearishCondition: "> 300k",
      source: "FRED (ICSA)",
      tooltip: "Weekly initial unemployment claims — the fastest-moving labor market indicator. Leads recessions by 2–4 months. Below 225k signals a tight labor market; above 300k signals deterioration.",
    },
    {
      id: "real-yield",
      name: "10-yr Real Yield (TIPS)",
      category: "leading",
      weight: 2,
      score: 0,
      value: "1.80%",
      description: "Real yields moderate. Equity risk premium under some pressure.",
      bullishCondition: "< 0.5%",
      neutralCondition: "0.5%–2.0%",
      bearishCondition: "> 2.0%",
      source: "FRED (DFII10)",
      tooltip: "10-Year Treasury Inflation-Indexed Security yield — the real hurdle rate for equities. High real yields compress P/E multiples by raising the discount rate. Below 0.5% is accommodative; above 2% is restrictive.",
    },
    {
      id: "lei",
      name: "Conference Board LEI",
      category: "leading",
      weight: 2,
      score: 0,
      value: "0.0% MoM",
      description: "Leading Economic Index flat month-over-month.",
      bullishCondition: "> 0% MoM",
      neutralCondition: "~0% MoM",
      bearishCondition: "< 0% MoM (esp. 6+ months)",
      source: "FRED (USSLIND)",
      tooltip: "Conference Board Leading Economic Index — a composite of 10 leading indicators (claims, building permits, stock prices, credit, etc.). Consecutive monthly declines have preceded every US recession. Complements CFNAI with a longer lead time.",
    },
    {
      id: "ig-spreads",
      name: "IG Credit Spreads",
      category: "leading",
      weight: 1.5,
      score: 0,
      value: "95 bps",
      description: "Investment-grade spreads tight. No early stress signals.",
      bullishCondition: "< 100 bps",
      neutralCondition: "100–150 bps",
      bearishCondition: "> 150 bps",
      source: "FRED (BAMLC0A0CM)",
      tooltip: "ICE BofA US Corporate Index Option-Adjusted Spread. Investment-grade spreads widen before high-yield in many cycles, providing an earlier warning of credit stress. Below 100 bps = calm; above 150 bps = stress building.",
    },
    {
      id: "rate-path",
      name: "Rate Path (2Y–FFR)",
      category: "leading",
      weight: 1.5,
      score: 0,
      value: "−0.10%",
      description: "2-Year Treasury near Fed Funds rate. Markets pricing steady rates.",
      bullishCondition: "< −0.25% (cuts priced)",
      neutralCondition: "±0.25%",
      bearishCondition: "> +0.25% (hikes priced)",
      source: "FRED (DGS2 vs DFF)",
      tooltip: "Spread between 2-Year Treasury yield and effective Fed Funds Rate. When 2Y < FFR, the bond market is pricing in rate cuts — dovish and bullish for equities. When 2Y > FFR, hikes are expected — hawkish headwind. More forward-looking than the current rate level.",
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
  { label: "Macro Momentum", signalIds: ["yield-curve", "pmi", "earnings", "lei", "jobless-claims"], tooltip: "Yield Curve, CFNAI, EPS Trends, LEI & Jobless Claims — tracks the direction and strength of the economic cycle." },
  { label: "Risk Appetite", signalIds: ["vix", "breadth", "insider", "sentiment", "seasonality"], tooltip: "VIX, Market Breadth, Insider Activity, Consumer Sentiment & Seasonality — measures market stress and positioning." },
  { label: "Liquidity", signalIds: ["m2", "nfci", "credit-spreads", "ig-spreads", "cb-liquidity"], tooltip: "M2 Money Supply, NFCI, HY & IG Credit Spreads, CB Balance Sheets — measures the availability and cost of capital." },
  { label: "Rates / Dollar", signalIds: ["dxy", "cadusd", "real-yield", "rate-path"], tooltip: "Dollar Index, CAD/USD, 10-yr Real Yield & Rate Path — tracks monetary tightening pressure and rate expectations." },
  { label: "Inflation", signalIds: ["inflation", "oil", "rate-path", "dxy"], tooltip: "Breakeven Inflation, Oil Momentum, Rate Path & DXY — tracks price pressure from multiple angles." },
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
