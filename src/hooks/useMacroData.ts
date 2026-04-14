import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMockSignals, MacroSignal, SignalScore, computeComposite, CompositeResult } from "@/lib/macroSignals";
import { useState, useMemo } from "react";

export interface InsiderAPIData {
  totalPurchaseValue: number;
  totalSaleValue: number;
  purchaseCount: number;
  saleCount: number;
  buyRatio: number;
  filingsParsed: number;
  score: number;
  daysScanned: number;
}

export interface EarningsAPIData {
  epsImprovingCount: number;
  epsDecliningCount: number;
  epsStableCount: number;
  companiesAnalyzed: number;
  recentEarnings8K: number;
  improvingRatio: number;
  score: number;
}

export interface MacroAPIResponse {
  vix: { value: number; asOf?: string | null } | null;
  oil: { value: number; previousValue?: number | null; changePercent?: number; asOf?: string | null; source?: string } | null;
  yieldCurve: { spread: number; asOf?: string | null } | null;
  creditSpread: { value: number; bps: number; asOf?: string | null } | null;
  m2: { yoyPercent: number; asOf?: string | null } | null;
  dxy: { value: number; previousValue: number | null; changePercent: number; asOf?: string | null } | null;
  pmi: { value: number; asOf?: string | null } | null;
  sentiment: { value: number; asOf?: string | null } | null;
  seasonality: { month: string; score: number; asOf?: string | null } | null;
  breadth: { wilshireReturn: number; sp500Return: number; spread: number; score: number; asOf?: string | null } | null;
  insider: (InsiderAPIData & { asOf?: string | null }) | null;
  earnings: (EarningsAPIData & { asOf?: string | null }) | null;
  nfci: { value: number; asOf?: string | null } | null;
  cape: { value: number; asOf?: string | null } | null;
  cadusd: { value: number; changePercent: number; asOf?: string | null } | null;
  inflation: { breakeven: number; breakevenPrev: number; breakevenDelta: number; oilMomentum13w: number; passThrough: number; score: number; asOf?: string | null } | null;
  fetchedAt: string;
}

export interface MacroSnapshot {
  id: string;
  snapshot_data: MacroAPIResponse;
  composite_score: number;
  regime: string;
  signals: Record<string, number>;
  created_at: string;
}

function scoreVIX(v: number): SignalScore { return v < 15 ? 1 : v <= 25 ? 0 : -1; }
function scoreYieldCurve(spread: number): SignalScore { return spread > 0.2 ? 1 : spread >= -0.1 ? 0 : -1; }
function scoreCreditSpread(bps: number): SignalScore { return bps < 350 ? 1 : bps <= 500 ? 0 : -1; }
function scoreM2(yoy: number): SignalScore { return yoy > 2 ? 1 : yoy >= -1 ? 0 : -1; }
function scoreOil(v: number, changePct: number): SignalScore {
  if (v > 100) return -1;
  if (changePct > 15) return -1;
  if (changePct > 8) return 0;
  if (v < 85 && changePct < 8) return 1;
  return 0;
}
function scoreCFNAI(v: number): SignalScore { return v > 0 ? 1 : v >= -0.7 ? 0 : -1; }
function scoreDXY(changePct: number): SignalScore { return changePct < -0.5 ? 1 : changePct <= 0.5 ? 0 : -1; }
function scoreNFCI(v: number): SignalScore { return v < -0.5 ? 1 : v <= 0 ? 0 : -1; }
function scoreCADUSD(changePct: number): SignalScore { return changePct < -0.5 ? 1 : changePct > 0.5 ? -1 : 0; }
function scoreInflation(breakeven: number, breakevenPrev: number, oilChangePct: number): SignalScore {
  const beDelta = breakeven - breakevenPrev;
  if (beDelta > 0.15 && oilChangePct > 10) return -1;
  if (beDelta > 0.10 || oilChangePct > 15) return -1;
  if (beDelta < -0.05 && oilChangePct < 5) return 1;
  if (breakeven < 2.0 && oilChangePct < 5) return 1;
  return 0;
}
function scoreSentiment(v: number): SignalScore {
  if (v < 60) return 1;
  if (v > 100) return -1;
  return 0;
}

export function applyLiveData(signals: MacroSignal[], data: MacroAPIResponse): MacroSignal[] {
  return signals.map((s) => {
    switch (s.id) {
      case "vix":
        if (data.vix) {
          const score = scoreVIX(data.vix.value);
          return { ...s, value: data.vix.value.toFixed(1), score, asOf: data.vix.asOf ?? undefined, description: `VIX at ${data.vix.value.toFixed(1)}. ${score === 1 ? "Low vol — favourable for trend-following." : score === 0 ? "Moderate volatility." : "Elevated — risk-off conditions."}` };
        }
        return s;
      case "yield-curve":
        if (data.yieldCurve) {
          const score = scoreYieldCurve(data.yieldCurve.spread);
          const bps = Math.round(data.yieldCurve.spread * 100);
          const str = `${bps >= 0 ? "+" : ""}${bps} bps`;
          return { ...s, value: str, score, asOf: data.yieldCurve.asOf ?? undefined, description: `2s10s spread at ${str}. ${score === 1 ? "Positive — bullish." : score === 0 ? "Flat — neutral." : "Inverted — recession warning."}` };
        }
        return s;
      case "credit-spreads":
        if (data.creditSpread) {
          const score = scoreCreditSpread(data.creditSpread.bps);
          return { ...s, value: `${data.creditSpread.bps} bps`, score, asOf: data.creditSpread.asOf ?? undefined, description: `HY OAS at ${data.creditSpread.bps} bps. ${score === 1 ? "Tight — risk appetite healthy." : score === 0 ? "Moderate range." : "Wide — credit stress."}` };
        }
        return s;
      case "m2":
        if (data.m2) {
          const score = scoreM2(data.m2.yoyPercent);
          const str = `${data.m2.yoyPercent >= 0 ? "+" : ""}${data.m2.yoyPercent.toFixed(1)}% YoY`;
          return { ...s, value: str, score, asOf: data.m2.asOf ?? undefined, description: `M2 money supply ${str}. ${score === 1 ? "Expanding — liquidity tailwind." : score === 0 ? "Flat." : "Contracting — liquidity headwind."}` };
        }
        return s;
      case "dxy":
        if (data.dxy) {
          const score = scoreDXY(data.dxy.changePercent);
          return { ...s, value: data.dxy.value.toFixed(1), score, asOf: data.dxy.asOf ?? undefined, description: `Trade-weighted dollar at ${data.dxy.value.toFixed(1)} (${data.dxy.changePercent > 0 ? "+" : ""}${data.dxy.changePercent.toFixed(2)}%). ${score === 1 ? "Weakening — bullish for risk assets." : score === 0 ? "Stable." : "Strengthening — headwind."}` };
        }
        return s;
      case "oil":
        if (data.oil) {
          const changePct = data.oil.changePercent ?? 0;
          const score = scoreOil(data.oil.value, changePct);
          const chgStr = changePct !== 0 ? ` (30d: ${changePct > 0 ? "+" : ""}${changePct.toFixed(1)}%)` : "";
          const src = data.oil.source === "Yahoo Finance" ? "Yahoo Finance (CL=F)" : "FRED (DCOILWTICO)";
          return { ...s, value: `$${data.oil.value.toFixed(2)}`, score, asOf: data.oil.asOf ?? undefined, source: src, description: `WTI crude at $${data.oil.value.toFixed(2)}${chgStr}. ${score === 1 ? "Stable — no supply shock." : score === 0 ? "Moderate price or momentum." : "Rapid run-up or elevated price — leading headwind."}` };
        }
        return s;
      case "pmi":
        if (data.pmi) {
          const score = scoreCFNAI(data.pmi.value);
          return { ...s, value: data.pmi.value.toFixed(2), score, asOf: data.pmi.asOf ?? undefined, description: `Chicago Fed National Activity Index at ${data.pmi.value.toFixed(2)}. ${score === 1 ? "Above-trend growth — economy expanding." : score === 0 ? "Near trend — neutral activity." : "Well below trend — recession risk."}`,
            bullishCondition: "> 0 (above trend)",
            neutralCondition: "0 to -0.7",
            bearishCondition: "< -0.7 (recession)",
          };
        }
        return s;
      case "sentiment":
        if (data.sentiment) {
          const score = scoreSentiment(data.sentiment.value);
          return { ...s, value: data.sentiment.value.toFixed(1), score, asOf: data.sentiment.asOf ?? undefined, description: `U. Michigan Consumer Sentiment at ${data.sentiment.value.toFixed(1)}. ${score === 1 ? "Extreme pessimism — contrarian bullish." : score === 0 ? "Neutral sentiment range." : "Extreme optimism — contrarian bearish."}`,
            bullishCondition: "< 60 (contrarian)",
            neutralCondition: "60–100",
            bearishCondition: "> 100 (contrarian)",
          };
        }
        return s;
      case "seasonality":
        if (data.seasonality) {
          return { ...s, value: data.seasonality.month, score: data.seasonality.score as SignalScore, asOf: data.seasonality.asOf ?? undefined, description: `Currently in ${data.seasonality.month}. ${data.seasonality.score === 1 ? "Historically favourable seasonal window (Nov–Apr)." : data.seasonality.score === -1 ? "Historically weak period (Sep–Oct)." : "Transitional seasonal period (May–Aug)."}` };
        }
        return s;
      case "breadth":
        if (data.breadth) {
          const score = data.breadth.score as SignalScore;
          const spread = data.breadth.spread > 0 ? `+${data.breadth.spread}` : `${data.breadth.spread}`;
          return { ...s, value: `${spread}%`, score, asOf: data.breadth.asOf ?? undefined, description: `Wilshire 5000 vs S&P 500 40-day relative spread: ${spread}%. Wilshire ${data.breadth.wilshireReturn > 0 ? "+" : ""}${data.breadth.wilshireReturn}% vs S&P 500 ${data.breadth.sp500Return > 0 ? "+" : ""}${data.breadth.sp500Return}%. ${score === 1 ? "Wilshire outperforming — small/mid-caps participating, broad rally." : score === 0 ? "Roughly in line — neutral breadth." : "S&P 500 leading — narrow large-cap leadership."}`,
            bullishCondition: "Wilshire > SP500 (broad)",
            neutralCondition: "In line",
            bearishCondition: "SP500 > Wilshire (narrow)",
          };
        }
        return s;
      case "insider":
        if (data.insider) {
          const score = data.insider.score as SignalScore;
          const buyPct = Math.round(data.insider.buyRatio * 100);
          const purchaseM = (data.insider.totalPurchaseValue / 1_000_000).toFixed(1);
          const saleM = (data.insider.totalSaleValue / 1_000_000).toFixed(1);
          return { ...s, value: `${buyPct}% buys`, score, asOf: data.insider.asOf ?? undefined, description: `SEC Form 4 insider activity (${data.insider.daysScanned}d): ${data.insider.purchaseCount} purchases ($${purchaseM}M) vs ${data.insider.saleCount} sales ($${saleM}M). Buy ratio: ${buyPct}%. ${score === 1 ? "Unusual insider buying — bullish signal." : score === 0 ? "Normal buy/sell mix." : "Heavy insider selling — bearish signal."}`,
            bullishCondition: "> 35% buy ratio",
            neutralCondition: "15–35%",
            bearishCondition: "< 15% buy ratio",
          };
        }
        return s;
      case "earnings":
        if (data.earnings) {
          const score = data.earnings.score as SignalScore;
          const improvPct = Math.round(data.earnings.improvingRatio * 100);
          return { ...s, value: `${improvPct}% improving`, score, asOf: data.earnings.asOf ?? undefined, description: `XBRL EPS trends across ${data.earnings.companiesAnalyzed} large-caps: ${data.earnings.epsImprovingCount} improving, ${data.earnings.epsDecliningCount} declining, ${data.earnings.epsStableCount} stable. ${data.earnings.recentEarnings8K} earnings 8-Ks filed in last 30d. ${score === 1 ? "Majority of earnings improving — bullish revision momentum." : score === 0 ? "Mixed earnings trends." : "Majority declining — bearish revision momentum."}`,
            bullishCondition: "> 50% improving",
            neutralCondition: "Mixed",
            bearishCondition: "> 50% declining",
          };
        }
        return s;
      case "nfci":
        if (data.nfci) {
          const score = scoreNFCI(data.nfci.value);
          return { ...s, value: data.nfci.value.toFixed(2), score, asOf: data.nfci.asOf ?? undefined, description: `Chicago Fed NFCI at ${data.nfci.value.toFixed(2)}. ${score === 1 ? "Loose financial conditions — bullish." : score === 0 ? "Neutral conditions." : "Tightening — credit stress rising."}` };
        }
        return s;
      case "cadusd":
        if (data.cadusd) {
          const score = scoreCADUSD(data.cadusd.changePercent);
          const chg = data.cadusd.changePercent > 0 ? `+${data.cadusd.changePercent.toFixed(2)}` : data.cadusd.changePercent.toFixed(2);
          return { ...s, value: `${data.cadusd.value.toFixed(4)}`, score, asOf: data.cadusd.asOf ?? undefined, description: `CAD/USD at ${data.cadusd.value.toFixed(4)} (${chg}%). ${score === 1 ? "CAD strengthening — risk-on, commodity demand healthy." : score === 0 ? "Stable." : "CAD weakening — risk-off signal."}` };
        }
        return s;
      default:
        return s;
    }
  });
}

function applySnapshotSignals(signals: MacroSignal[], snapshotSignals: Record<string, number>, snapshotData: MacroAPIResponse): MacroSignal[] {
  let updated = applyLiveData(signals, snapshotData);
  updated = updated.map((s) => {
    if (s.id in snapshotSignals) {
      return { ...s, score: snapshotSignals[s.id] as SignalScore };
    }
    return s;
  });
  return updated;
}

export function useMacroData() {
  const [selectedSnapshotIdx, setSelectedSnapshotIdx] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: liveData, isLoading, error, refetch } = useQuery<MacroAPIResponse>({
    queryKey: ["macro-data"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-macro-data");
      if (error) throw error;
      return data as MacroAPIResponse;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const refreshLive = async () => {
    setIsRefreshing(true);
    try {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      await fetch(`${url}/functions/v1/fetch-macro-data?refresh=true`, {
        headers: { "Authorization": `Bearer ${key}`, "apikey": key },
      });
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const { data: historyData } = useQuery<{ snapshots: MacroSnapshot[] }>({
    queryKey: ["macro-history"],
    queryFn: async () => {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${url}/functions/v1/fetch-macro-data?action=history&limit=90`, {
        headers: {
          "Authorization": `Bearer ${key}`,
          "apikey": key,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const snapshots = historyData?.snapshots ?? [];
  const mockSignals = getMockSignals();

  const capeValue = liveData?.cape?.value ?? 33.2;
  const capeElevated = capeValue > 30;

  const { signals, result, isViewingHistory, currentSnapshot } = useMemo(() => {
    if (selectedSnapshotIdx !== null && snapshots[selectedSnapshotIdx]) {
      const snap = snapshots[selectedSnapshotIdx];
      const sigs = applySnapshotSignals(mockSignals, snap.signals ?? {}, snap.snapshot_data);
      const res = computeComposite(sigs, capeElevated);
      return { signals: sigs, result: res, isViewingHistory: true, currentSnapshot: snap };
    }

    const sigs = liveData ? applyLiveData(mockSignals, liveData) : mockSignals;
    const res = computeComposite(sigs, capeElevated);
    return { signals: sigs, result: res, isViewingHistory: false, currentSnapshot: null };
  }, [liveData, selectedSnapshotIdx, snapshots, capeElevated]);

  return {
    signals,
    result,
    isLoading,
    isLive: !!liveData && !error,
    error,
    fetchedAt: liveData?.fetchedAt ?? null,
    snapshots,
    selectedSnapshotIdx,
    setSelectedSnapshotIdx,
    isViewingHistory,
    currentSnapshot,
    capeValue,
    capeElevated,
    capeAsOf: liveData?.cape?.asOf ?? null,
    refreshLive,
    isRefreshing,
  };
}
