const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AV_BASE = "https://www.alphavantage.co/query";
const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

interface FREDResponse {
  observations?: Array<{ date: string; value: string }>;
}

interface AVTimeSeriesDaily {
  "Time Series (Daily)"?: Record<string, { "4. close": string }>;
}

async function fetchFRED(seriesId: string, apiKey: string): Promise<string | null> {
  const url = new URL(FRED_BASE);
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", "5");
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`FRED API error for ${seriesId}: ${res.status}`);
  const data: FREDResponse = await res.json();
  const obs = data.observations?.find((o) => o.value !== ".");
  return obs?.value ?? null;
}

async function fetchFREDSeries(seriesId: string, apiKey: string, limit: number): Promise<Array<{ date: string; value: string }>> {
  const url = new URL(FRED_BASE);
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", String(limit));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`FRED API error for ${seriesId}: ${res.status}`);
  const data: FREDResponse = await res.json();
  return data.observations?.filter((o) => o.value !== ".") ?? [];
}

async function fetchAVDaily(symbol: string, apiKey: string): Promise<number[]> {
  const url = new URL(AV_BASE);
  url.searchParams.set("function", "TIME_SERIES_DAILY");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("outputsize", "compact"); // last 100 days
  url.searchParams.set("apikey", apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`AV API error for ${symbol}: ${res.status}`);
  const data: AVTimeSeriesDaily = await res.json();
  const ts = data["Time Series (Daily)"];
  if (!ts) return [];
  // Return closes sorted newest first
  return Object.keys(ts)
    .sort((a, b) => b.localeCompare(a))
    .map((d) => parseFloat(ts[d]["4. close"]))
    .filter((v) => !isNaN(v));
}

// Scoring functions
function scoreVIX(v: number) { return v < 15 ? 1 : v <= 25 ? 0 : -1; }
function scoreYieldCurve(s: number) { return s > 0.2 ? 1 : s >= -0.1 ? 0 : -1; }
function scoreCreditSpread(bps: number) { return bps < 350 ? 1 : bps <= 500 ? 0 : -1; }
function scoreM2(yoy: number) { return yoy > 2 ? 1 : yoy >= -1 ? 0 : -1; }
function scoreOil(v: number) { return v < 85 ? 1 : v <= 100 ? 0 : -1; }
function scorePMI(v: number) { return v > 52 ? 1 : v >= 48 ? 0 : -1; }
function scoreSentiment(v: number) {
  if (v < 60) return 1;
  if (v > 100) return -1;
  return 0;
}
function scoreDXY(current: number, previous: number) {
  const changePct = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  return changePct < -0.5 ? 1 : changePct <= 0.5 ? 0 : -1;
}
function scoreBreadth(rspReturnPct: number, spyReturnPct: number): number {
  // RSP vs SPY relative performance over ~50 days
  // RSP outperforming = broad participation = bullish breadth
  // SPY outperforming = narrow leadership = bearish breadth
  const spread = rspReturnPct - spyReturnPct;
  if (spread > 1) return 1;   // RSP outperforming by >1% = broad breadth
  if (spread >= -1) return 0;  // roughly in line
  return -1;                   // SPY leading by >1% = narrow breadth
}
function scoreSeasonality(): number {
  const month = new Date().getMonth();
  if (month >= 10 || month <= 3) return 1;
  if (month === 8 || month === 9) return -1;
  return 0;
}
function getSeasonLabel(): string {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[new Date().getMonth()];
}

function computeComposite(signals: Record<string, number>): { score: number; regime: string } {
  const weighted =
    (signals["yield-curve"] ?? 0) * 2 +
    (signals["credit-spreads"] ?? 0) * 2 +
    (signals["breadth"] ?? 0) * 2 +
    (signals["insider"] ?? 0) * 2 +
    (signals["m2"] ?? 0) * 2 +
    (signals["vix"] ?? 0) * 1 +
    (signals["pmi"] ?? 0) * 1 +
    (signals["dxy"] ?? 0) * 1 +
    (signals["oil"] ?? 0) * 1 +
    (signals["earnings"] ?? 0) * 1 +
    (signals["sentiment"] ?? 0) * 0.5 +
    (signals["seasonality"] ?? 0) * 0.5;

  const totalPossible = 16;
  const normalized = Math.max(-1, Math.min(1, weighted / totalPossible));

  let regime = "cash";
  if (normalized > 0.5) regime = "full";
  else if (normalized > 0) regime = "half";
  else if (normalized > -0.5) regime = "minimal";

  return { score: normalized, regime };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const reqUrl = new URL(req.url);
  const action = reqUrl.searchParams.get("action");

  // Handle history query
  if (action === "history") {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const limit = Math.min(parseInt(reqUrl.searchParams.get("limit") ?? "90"), 365);
    const { data, error } = await supabase
      .from("macro_snapshots")
      .select("id, snapshot_data, composite_score, regime, signals, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ snapshots: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Default: fetch fresh data
  const fredKey = Deno.env.get("FRED_API_KEY");
  const avKey = Deno.env.get("ALPHA_VANTAGE_API_KEY");

  if (!fredKey) {
    return new Response(JSON.stringify({ error: "FRED_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // All fetches in parallel
    const [
      fredYieldSpread, fredCreditSpread, fredOil,
      fredVIX, fredPMI, fredSentiment, fredDXY,
      rspPrices, spyPrices,
    ] = await Promise.all([
      fetchFRED("T10Y2Y", fredKey).catch(() => null),
      fetchFRED("BAMLH0A0HYM2", fredKey).catch(() => null),
      fetchFRED("DCOILWTICO", fredKey).catch(() => null),
      fetchFRED("VIXCLS", fredKey).catch(() => null),
      fetchFRED("NAPM", fredKey).catch(() => null),
      fetchFRED("UMCSENT", fredKey).catch(() => null),
      fetchFREDSeries("DTWEXBGS", fredKey, 30).catch(() => []),
      // Breadth proxy: RSP (equal-weight S&P 500) vs SPY (cap-weight)
      avKey ? fetchAVDaily("RSP", avKey).catch(() => []) : Promise.resolve([]),
      avKey ? fetchAVDaily("SPY", avKey).catch(() => []) : Promise.resolve([]),
    ]);

    // M2 YoY calculation
    let m2YoY: number | null = null;
    try {
      const m2Obs = await fetchFREDSeries("WM2NS", fredKey, 60);
      if (m2Obs.length >= 52) {
        const current = parseFloat(m2Obs[0].value);
        const yearAgo = parseFloat(m2Obs[51].value);
        if (!isNaN(current) && !isNaN(yearAgo) && yearAgo > 0) {
          m2YoY = ((current - yearAgo) / yearAgo) * 100;
        }
      }
    } catch { /* ignore */ }

    // Parse FRED values
    const vixValue = fredVIX ? parseFloat(fredVIX) : null;
    const yieldSpread = fredYieldSpread ? parseFloat(fredYieldSpread) : null;
    const creditSpreadVal = fredCreditSpread ? parseFloat(fredCreditSpread) : null;
    const oilPrice = fredOil ? parseFloat(fredOil) : null;
    const pmiValue = fredPMI ? parseFloat(fredPMI) : null;
    const sentimentValue = fredSentiment ? parseFloat(fredSentiment) : null;

    // DXY direction
    const dxyObs = fredDXY as Array<{ date: string; value: string }>;
    let dxyCurrent: number | null = null;
    let dxyPrevious: number | null = null;
    if (Array.isArray(dxyObs) && dxyObs.length >= 2) {
      dxyCurrent = parseFloat(dxyObs[0].value);
      dxyPrevious = parseFloat(dxyObs[1].value);
    }

    // Breadth: RSP vs SPY relative performance over ~50 trading days
    let breadthData: { rspReturn: number; spyReturn: number; spread: number; score: number } | null = null;
    const rsp = rspPrices as number[];
    const spy = spyPrices as number[];
    const lookback = 50;
    if (rsp.length > lookback && spy.length > lookback) {
      const rspReturn = ((rsp[0] - rsp[lookback]) / rsp[lookback]) * 100;
      const spyReturn = ((spy[0] - spy[lookback]) / spy[lookback]) * 100;
      const spread = rspReturn - spyReturn;
      breadthData = {
        rspReturn: Math.round(rspReturn * 100) / 100,
        spyReturn: Math.round(spyReturn * 100) / 100,
        spread: Math.round(spread * 100) / 100,
        score: scoreBreadth(rspReturn, spyReturn),
      };
    }

    // Seasonality
    const seasonScore = scoreSeasonality();
    const seasonLabel = getSeasonLabel();

    const result = {
      vix: vixValue !== null && !isNaN(vixValue) ? { value: vixValue } : null,
      yieldCurve: yieldSpread !== null && !isNaN(yieldSpread) ? { spread: yieldSpread } : null,
      creditSpread: creditSpreadVal !== null && !isNaN(creditSpreadVal) ? { value: creditSpreadVal, bps: Math.round(creditSpreadVal * 100) } : null,
      m2: m2YoY !== null ? { yoyPercent: m2YoY } : null,
      oil: oilPrice !== null && !isNaN(oilPrice) ? { value: oilPrice } : null,
      dxy: dxyCurrent !== null && !isNaN(dxyCurrent) ? {
        value: dxyCurrent,
        previousValue: dxyPrevious,
        changePercent: dxyPrevious && !isNaN(dxyPrevious) ? ((dxyCurrent - dxyPrevious) / dxyPrevious) * 100 : 0,
      } : null,
      pmi: pmiValue !== null && !isNaN(pmiValue) ? { value: pmiValue } : null,
      sentiment: sentimentValue !== null && !isNaN(sentimentValue) ? { value: sentimentValue } : null,
      seasonality: { month: seasonLabel, score: seasonScore },
      breadth: breadthData,
      fetchedAt: new Date().toISOString(),
    };

    // Compute signal scores
    const signalScores: Record<string, number> = {
      // Still mock (no free public API):
      "insider": 0,
      "earnings": 1,
    };
    if (result.vix) signalScores["vix"] = scoreVIX(result.vix.value);
    if (result.yieldCurve) signalScores["yield-curve"] = scoreYieldCurve(result.yieldCurve.spread);
    if (result.creditSpread) signalScores["credit-spreads"] = scoreCreditSpread(result.creditSpread.bps);
    if (result.m2) signalScores["m2"] = scoreM2(result.m2.yoyPercent);
    if (result.oil) signalScores["oil"] = scoreOil(result.oil.value);
    if (result.dxy && dxyCurrent && dxyPrevious) signalScores["dxy"] = scoreDXY(dxyCurrent, dxyPrevious);
    if (result.pmi) signalScores["pmi"] = scorePMI(result.pmi.value);
    if (result.sentiment) signalScores["sentiment"] = scoreSentiment(result.sentiment.value);
    if (result.breadth) signalScores["breadth"] = result.breadth.score;
    signalScores["seasonality"] = seasonScore;

    const composite = computeComposite(signalScores);

    // Save snapshot
    try {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      await supabase.from("macro_snapshots").insert({
        snapshot_data: result,
        composite_score: parseFloat(composite.score.toFixed(4)),
        regime: composite.regime,
        signals: signalScores,
      });
      console.log("Snapshot saved, composite:", composite.score.toFixed(4), "regime:", composite.regime);
    } catch (e) {
      console.error("Failed to save snapshot:", e);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching macro data:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
