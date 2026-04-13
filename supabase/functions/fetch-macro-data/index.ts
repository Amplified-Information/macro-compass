import { corsHeaders } from "@supabase/supabase-js/cors";

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
  // Find the latest non-"." value
  const obs = data.observations?.find((o) => o.value !== ".");
  return obs?.value ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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
    // Fetch everything in parallel
    const [
      vixData, dxyData,
      fredYieldSpread, fredCreditSpread, fredM2, fredOil, fredPMI,
    ] = await Promise.all([
      // Alpha Vantage: VIX, DXY proxy
      fetchAV({ function: "GLOBAL_QUOTE", symbol: "VIX" }, avKey).catch(() => null),
      fetchAV({ function: "GLOBAL_QUOTE", symbol: "UUP" }, avKey).catch(() => null),
      // FRED: Yield curve spread (T10Y2Y), Credit spreads (HY OAS), M2, Oil (WTI), PMI proxy
      fetchFRED("T10Y2Y", fredKey).catch(() => null),
      fetchFRED("BAMLH0A0HYM2", fredKey).catch(() => null),
      fetchFRED("WM2NS", fredKey).catch(() => null),  // M2 weekly
      fetchFRED("DCOILWTICO", fredKey).catch(() => null),
      fetchFRED("MANEMP", fredKey).catch(() => null),  // Manufacturing employment as PMI proxy
    ]);

    // Also fetch previous M2 for YoY calculation
    let m2YoY: number | null = null;
    if (fredM2) {
      try {
        const url = new URL(FRED_BASE);
        url.searchParams.set("series_id", "WM2NS");
        url.searchParams.set("api_key", fredKey);
        url.searchParams.set("file_type", "json");
        url.searchParams.set("sort_order", "desc");
        url.searchParams.set("limit", "60"); // ~1 year of weekly data
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

    // Parse Alpha Vantage
    const vixPrice = parseFloat((vixData as AVQuote)?.["Global Quote"]?.["05. price"] ?? "");
    const dxyPrice = parseFloat((dxyData as AVQuote)?.["Global Quote"]?.["05. price"] ?? "");
    const dxyChange = parseFloat((dxyData as AVQuote)?.["Global Quote"]?.["10. change percent"]?.replace("%", "") ?? "");

    // Parse FRED values
    const yieldSpread = fredYieldSpread ? parseFloat(fredYieldSpread) : null;
    const creditSpread = fredCreditSpread ? parseFloat(fredCreditSpread) : null; // in percentage points (e.g., 3.5 = 350 bps)
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

    console.log("Macro data fetched:", JSON.stringify(result));

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
