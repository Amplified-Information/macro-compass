import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMockSignals, MacroSignal, SignalScore } from "@/lib/macroSignals";

interface MacroAPIResponse {
  vix: { value: number } | null;
  oil: { value: number } | null;
  yieldCurve: { spread: number; y2: number; y10: number } | null;
  dxy: { value: number; changePercent: number } | null;
  fetchedAt: string;
}

function scoreVIX(value: number): SignalScore {
  if (value < 15) return 1;
  if (value <= 25) return 0;
  return -1;
}

function scoreYieldCurve(spread: number): SignalScore {
  if (spread > 0.2) return 1; // positive & steepening
  if (spread >= -0.1) return 0; // flat
  return -1; // inverted
}

function scoreDXY(changePercent: number): SignalScore {
  if (changePercent < -0.3) return 1; // weakening = bullish for equities
  if (changePercent <= 0.3) return 0;
  return -1; // strengthening = bearish
}

function scoreOil(value: number): SignalScore {
  // Stable oil is bullish, spiking is bearish
  // Using USO ETF price — rough heuristic based on recent ranges
  if (value < 85) return 1;
  if (value <= 95) return 0;
  return -1;
}

function applyLiveData(signals: MacroSignal[], data: MacroAPIResponse): MacroSignal[] {
  return signals.map((s) => {
    switch (s.id) {
      case "vix":
        if (data.vix) {
          const score = scoreVIX(data.vix.value);
          return { ...s, value: data.vix.value.toFixed(1), score, description: `VIX at ${data.vix.value.toFixed(1)} — ${score === 1 ? "low vol, favourable for trend-following" : score === 0 ? "moderate volatility" : "elevated volatility, risk-off conditions"}.` };
        }
        return s;
      case "yield-curve":
        if (data.yieldCurve) {
          const score = scoreYieldCurve(data.yieldCurve.spread);
          const spreadStr = (data.yieldCurve.spread >= 0 ? "+" : "") + (data.yieldCurve.spread * 100).toFixed(0) + " bps";
          return { ...s, value: spreadStr, score, description: `2s10s spread at ${spreadStr}. ${score === 1 ? "Positive and steepening — bullish signal." : score === 0 ? "Roughly flat — neutral." : "Inverted — recession warning."}` };
        }
        return s;
      case "dxy":
        if (data.dxy) {
          const score = scoreDXY(data.dxy.changePercent);
          return { ...s, value: data.dxy.value.toFixed(1), score, description: `Dollar index proxy at ${data.dxy.value.toFixed(1)} (${data.dxy.changePercent > 0 ? "+" : ""}${data.dxy.changePercent.toFixed(2)}%). ${score === 1 ? "Weakening — bullish for risk assets." : score === 0 ? "Stable." : "Strengthening — headwind for equities."}` };
        }
        return s;
      case "oil":
        if (data.oil) {
          const score = scoreOil(data.oil.value);
          return { ...s, value: `$${data.oil.value.toFixed(2)}`, score, description: `Oil proxy (USO) at $${data.oil.value.toFixed(2)}. ${score === 1 ? "Stable range — no supply shock pressure." : score === 0 ? "Moderate level." : "Elevated — supply pressure risk."}` };
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
    staleTime: 5 * 60 * 1000, // 5 minutes
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
