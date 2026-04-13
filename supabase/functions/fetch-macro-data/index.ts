const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AV_BASE = "https://www.alphavantage.co/query";
const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

interface AVQuote {
  "Global Quote"?: {
    "05. price"?: string;
    "10. change percent"?: string;
  };
}

interface FREDResponse {
  observations?: Array<{ date: string; value: string }>;
}

async function fetchAV(params: Record<string, string>, apiKey: string) {
  const url = new URL(AV_BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("apikey", apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`AV API error: ${res.status}`);
  return res.json();
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

function scoreVIX(v: number) { return v < 15 ? 1 : v <= 25 ? 0 : -1; }
function scoreYieldCurve(s: number) { return s > 0.2 ? 1 : s >= -0.1 ? 0 : -1; }
function scoreCreditSpread(bps: number) { return bps < 350 ? 1 : bps <= 500 ? 0 : -1; }
function scoreM2(yoy: number) { return yoy > 2 ? 1 : yoy >= -1 ? 0 : -1; }
function scoreDXY(c: number) { return c < -0.3 ? 1 : c <= 0.3 ? 0 : -1; }
function scoreOil(v: number) { return v < 85 ? 1 : v <= 100 ? 0 : -1; }

// Simple composite calculation mirroring frontend logic
function computeComposite(signals: Record<string, number>): { score: number; regime: string } {
  // Leading (2x): yield-curve, credit-spreads, breadth, insider, m2
  // Coincident (1x): vix, pmi, dxy, oil, earnings
  // Sentiment (0.5x): sentiment, seasonality
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
  const avKey = Deno.env.get("ALPHA_VANTAGE_API_KEY");
  const fredKey = Deno.env.get("FRED_API_KEY");

  if (!avKey) {
    return new Response(JSON.stringify({ error: "ALPHA_VANTAGE_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!fredKey) {
    return new Response(JSON.stringify({ error: "FRED_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const [
      vixData, dxyData,
      fredYieldSpread, fredCreditSpread, fredM2, fredOil, fredPMI,
    ] = await Promise.all([
      fetchAV({ function: "GLOBAL_QUOTE", symbol: "VIX" }, avKey).catch(() => null),
      fetchAV({ function: "GLOBAL_QUOTE", symbol: "UUP" }, avKey).catch(() => null),
      fetchFRED("T10Y2Y", fredKey).catch(() => null),
      fetchFRED("BAMLH0A0HYM2", fredKey).catch(() => null),
      fetchFRED("WM2NS", fredKey).catch(() => null),
      fetchFRED("DCOILWTICO", fredKey).catch(() => null),
      fetchFRED("MANEMP", fredKey).catch(() => null),
    ]);

    let m2YoY: number | null = null;
    if (fredM2) {
      try {
        const url = new URL(FRED_BASE);
        url.searchParams.set("series_id", "WM2NS");
        url.searchParams.set("api_key", fredKey);
        url.searchParams.set("file_type", "json");
        url.searchParams.set("sort_order", "desc");
        url.searchParams.set("limit", "60");
        const res = await fetch(url.toString());
        const data: FREDResponse = await res.json();
        const validObs = data.observations?.filter((o) => o.value !== ".") ?? [];
        if (validObs.length >= 52) {
          const current = parseFloat(validObs[0].value);
          const yearAgo = parseFloat(validObs[51].value);
          if (!isNaN(current) && !isNaN(yearAgo) && yearAgo > 0) {
            m2YoY = ((current - yearAgo) / yearAgo) * 100;
          }
        }
      } catch { /* ignore */ }
    }

    const vixPrice = parseFloat((vixData as AVQuote)?.["Global Quote"]?.["05. price"] ?? "");
    const dxyPrice = parseFloat((dxyData as AVQuote)?.["Global Quote"]?.["05. price"] ?? "");
    const dxyChange = parseFloat((dxyData as AVQuote)?.["Global Quote"]?.["10. change percent"]?.replace("%", "") ?? "");
    const yieldSpread = fredYieldSpread ? parseFloat(fredYieldSpread) : null;
    const creditSpread = fredCreditSpread ? parseFloat(fredCreditSpread) : null;
    const oilPrice = fredOil ? parseFloat(fredOil) : null;

    const result = {
      vix: !isNaN(vixPrice) ? { value: vixPrice } : null,
      yieldCurve: yieldSpread !== null && !isNaN(yieldSpread) ? { spread: yieldSpread } : null,
      creditSpread: creditSpread !== null && !isNaN(creditSpread) ? { value: creditSpread, bps: Math.round(creditSpread * 100) } : null,
      m2: m2YoY !== null ? { yoyPercent: m2YoY } : null,
      oil: oilPrice !== null && !isNaN(oilPrice) ? { value: oilPrice } : null,
      dxy: !isNaN(dxyPrice) ? { value: dxyPrice, changePercent: !isNaN(dxyChange) ? dxyChange : 0 } : null,
      fetchedAt: new Date().toISOString(),
    };

    // Compute signal scores for snapshot
    const signalScores: Record<string, number> = {
      // Mock defaults for signals we don't fetch
      "breadth": 1, "insider": 0, "pmi": 0, "earnings": 1, "sentiment": 0, "seasonality": 1,
    };
    if (result.vix) signalScores["vix"] = scoreVIX(result.vix.value);
    if (result.yieldCurve) signalScores["yield-curve"] = scoreYieldCurve(result.yieldCurve.spread);
    if (result.creditSpread) signalScores["credit-spreads"] = scoreCreditSpread(result.creditSpread.bps);
    if (result.m2) signalScores["m2"] = scoreM2(result.m2.yoyPercent);
    if (result.dxy) signalScores["dxy"] = scoreDXY(result.dxy.changePercent);
    if (result.oil) signalScores["oil"] = scoreOil(result.oil.value);

    const composite = computeComposite(signalScores);

    // Save snapshot to database
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
