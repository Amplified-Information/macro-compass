import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMockSignals, MacroSignal, SignalScore } from "@/lib/macroSignals";

interface MacroAPIResponse {
  vix: { value: number } | null;
  oil: { value: number } | null;
  yieldCurve: { spread: number } | null;
  creditSpread: { value: number; bps: number } | null;
  m2: { yoyPercent: number } | null;
  dxy: { value: number; changePercent: number } | null;
  fetchedAt: string;
}

function scoreVIX(v: number): SignalScore {
  return v < 15 ? 1 : v <= 25 ? 0 : -1;
}

function scoreYieldCurve(spread: number): SignalScore {
  return spread > 0.2 ? 1 : spread >= -0.1 ? 0 : -1;
}

function scoreCreditSpread(bps: number): SignalScore {
  // HY OAS: tight < 350 bps bullish, 350-500 neutral, > 500 bearish
  return bps < 350 ? 1 : bps <= 500 ? 0 : -1;
}

function scoreM2(yoy: number): SignalScore {
  return yoy > 2 ? 1 : yoy >= -1 ? 0 : -1;
}

function scoreDXY(changePct: number): SignalScore {
  return changePct < -0.3 ? 1 : changePct <= 0.3 ? 0 : -1;
}

function scoreOil(v: number): SignalScore {
  return v < 85 ? 1 : v <= 100 ? 0 : -1;
}

function applyLiveData(signals: MacroSignal[], data: MacroAPIResponse): MacroSignal[] {
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
          return { ...s, value: data.dxy.value.toFixed(1), score, description: `Dollar proxy at ${data.dxy.value.toFixed(1)} (${data.dxy.changePercent > 0 ? "+" : ""}${data.dxy.changePercent.toFixed(2)}%). ${score === 1 ? "Weakening — bullish for risk assets." : score === 0 ? "Stable." : "Strengthening — headwind."}` };
        }
        return s;

      case "oil":
        if (data.oil) {
          const score = scoreOil(data.oil.value);
          return { ...s, value: `$${data.oil.value.toFixed(2)}`, score, description: `WTI crude at $${data.oil.value.toFixed(2)}. ${score === 1 ? "Stable — no supply shock." : score === 0 ? "Moderate." : "Spiking — supply pressure."}` };
        }
        return s;

      default:
        return s;
    }
  });
}

export function useMacroData() {
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

  const mockSignals = getMockSignals();
  const signals = liveData ? applyLiveData(mockSignals, liveData) : mockSignals;

  return {
    signals,
    isLoading,
    isLive: !!liveData && !error,
    error,
    fetchedAt: liveData?.fetchedAt ?? null,
  };
}
