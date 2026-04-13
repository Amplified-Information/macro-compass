import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMockSignals, MacroSignal, SignalScore, computeComposite, CAPE_ELEVATED, CompositeResult } from "@/lib/macroSignals";
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

export interface MacroAPIResponse {
  vix: { value: number } | null;
  oil: { value: number } | null;
  yieldCurve: { spread: number } | null;
  creditSpread: { value: number; bps: number } | null;
  m2: { yoyPercent: number } | null;
  dxy: { value: number; previousValue: number | null; changePercent: number } | null;
  pmi: { value: number } | null;
  sentiment: { value: number } | null;
  seasonality: { month: string; score: number } | null;
  breadth: { rspReturn: number; spyReturn: number; spread: number; score: number } | null;
  insider: InsiderAPIData | null;
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
function scoreOil(v: number): SignalScore { return v < 85 ? 1 : v <= 100 ? 0 : -1; }
function scorePMI(v: number): SignalScore { return v > 52 ? 1 : v >= 48 ? 0 : -1; }
function scoreDXY(changePct: number): SignalScore { return changePct < -0.5 ? 1 : changePct <= 0.5 ? 0 : -1; }
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
          return { ...s, value: data.vix.value.toFixed(1), score, description: `VIX at ${data.vix.value.toFixed(1)}. ${score === 1 ? "Low vol — favourable for trend-following." : score === 0 ? "Moderate volatility." : "Elevated — risk-off conditions."}` };
        }
        return s;
      case "yield-curve":
        if (data.yieldCurve) {
          const score = scoreYieldCurve(data.yieldCurve.spread);
          const bps = Math.round(data.yieldCurve.spread * 100);
          const str = `${bps >= 0 ? "+" : ""}${bps} bps`;
          return { ...s, value: str, score, description: `2s10s spread at ${str}. ${score === 1 ? "Positive — bullish." : score === 0 ? "Flat — neutral." : "Inverted — recession warning."}` };
        }
        return s;
      case "credit-spreads":
        if (data.creditSpread) {
          const score = scoreCreditSpread(data.creditSpread.bps);
          return { ...s, value: `${data.creditSpread.bps} bps`, score, description: `HY OAS at ${data.creditSpread.bps} bps. ${score === 1 ? "Tight — risk appetite healthy." : score === 0 ? "Moderate range." : "Wide — credit stress."}` };
        }
        return s;
      case "m2":
        if (data.m2) {
          const score = scoreM2(data.m2.yoyPercent);
          const str = `${data.m2.yoyPercent >= 0 ? "+" : ""}${data.m2.yoyPercent.toFixed(1)}% YoY`;
          return { ...s, value: str, score, description: `M2 money supply ${str}. ${score === 1 ? "Expanding — liquidity tailwind." : score === 0 ? "Flat." : "Contracting — liquidity headwind."}` };
        }
        return s;
      case "dxy":
        if (data.dxy) {
          const score = scoreDXY(data.dxy.changePercent);
          return { ...s, value: data.dxy.value.toFixed(1), score, description: `Trade-weighted dollar at ${data.dxy.value.toFixed(1)} (${data.dxy.changePercent > 0 ? "+" : ""}${data.dxy.changePercent.toFixed(2)}%). ${score === 1 ? "Weakening — bullish for risk assets." : score === 0 ? "Stable." : "Strengthening — headwind."}` };
        }
        return s;
      case "oil":
        if (data.oil) {
          const score = scoreOil(data.oil.value);
          return { ...s, value: `$${data.oil.value.toFixed(2)}`, score, description: `WTI crude at $${data.oil.value.toFixed(2)}. ${score === 1 ? "Stable — no supply shock." : score === 0 ? "Moderate." : "Spiking — supply pressure."}` };
        }
        return s;
      case "pmi":
        if (data.pmi) {
          const score = scorePMI(data.pmi.value);
          return { ...s, value: data.pmi.value.toFixed(1), score, description: `ISM Manufacturing PMI at ${data.pmi.value.toFixed(1)}. ${score === 1 ? "Expansionary — economy growing." : score === 0 ? "Borderline — mixed signals." : "Contractionary — recession risk."}` };
        }
        return s;
      case "sentiment":
        if (data.sentiment) {
          const score = scoreSentiment(data.sentiment.value);
          return { ...s, value: data.sentiment.value.toFixed(1), score, description: `U. Michigan Consumer Sentiment at ${data.sentiment.value.toFixed(1)}. ${score === 1 ? "Extreme pessimism — contrarian bullish." : score === 0 ? "Neutral sentiment range." : "Extreme optimism — contrarian bearish."}`,
            bullishCondition: "< 60 (contrarian)",
            neutralCondition: "60–100",
            bearishCondition: "> 100 (contrarian)",
          };
        }
        return s;
      case "seasonality":
        if (data.seasonality) {
          return { ...s, value: data.seasonality.month, score: data.seasonality.score as SignalScore, description: `Currently in ${data.seasonality.month}. ${data.seasonality.score === 1 ? "Historically favourable seasonal window (Nov–Apr)." : data.seasonality.score === -1 ? "Historically weak period (Sep–Oct)." : "Transitional seasonal period (May–Aug)."}` };
        }
        return s;
      case "breadth":
        if (data.breadth) {
          const score = data.breadth.score as SignalScore;
          const spread = data.breadth.spread > 0 ? `+${data.breadth.spread}` : `${data.breadth.spread}`;
          return { ...s, value: `${spread}%`, score, description: `RSP vs SPY 50-day relative spread: ${spread}%. RSP ${data.breadth.rspReturn > 0 ? "+" : ""}${data.breadth.rspReturn}% vs SPY ${data.breadth.spyReturn > 0 ? "+" : ""}${data.breadth.spyReturn}%. ${score === 1 ? "Equal-weight outperforming — broad participation." : score === 0 ? "Roughly in line — neutral breadth." : "Cap-weight leading — narrow leadership, fewer stocks participating."}`,
            bullishCondition: "RSP > SPY (broad)",
            neutralCondition: "In line",
            bearishCondition: "SPY > RSP (narrow)",
          };
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

  const { data: liveData, isLoading, error } = useQuery<MacroAPIResponse>({
    queryKey: ["macro-data"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-macro-data");
      if (error) throw error;
      return data as MacroAPIResponse;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

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

  const { signals, result, isViewingHistory, currentSnapshot } = useMemo(() => {
    if (selectedSnapshotIdx !== null && snapshots[selectedSnapshotIdx]) {
      const snap = snapshots[selectedSnapshotIdx];
      const sigs = applySnapshotSignals(mockSignals, snap.signals ?? {}, snap.snapshot_data);
      const res = computeComposite(sigs, CAPE_ELEVATED);
      return { signals: sigs, result: res, isViewingHistory: true, currentSnapshot: snap };
    }

    const sigs = liveData ? applyLiveData(mockSignals, liveData) : mockSignals;
    const res = computeComposite(sigs, CAPE_ELEVATED);
    return { signals: sigs, result: res, isViewingHistory: false, currentSnapshot: null };
  }, [liveData, selectedSnapshotIdx, snapshots]);

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
  };
}
