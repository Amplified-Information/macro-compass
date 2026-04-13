import { corsHeaders } from "@supabase/supabase-js/cors";

const AV_BASE = "https://www.alphavantage.co/query";

interface AVQuote {
  "Global Quote"?: {
    "05. price"?: string;
    "10. change percent"?: string;
  };
}

interface AVYield {
  data?: Array<{ date: string; value: string }>;
}

async function fetchAV(params: Record<string, string>, apiKey: string) {
  const url = new URL(AV_BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("apikey", apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`AV API error: ${res.status}`);
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("ALPHA_VANTAGE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ALPHA_VANTAGE_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Fetch in parallel: VIX, Oil (WTI), Treasury yields (2Y, 10Y), DXY
    const [vixData, oilData, yield2Y, yield10Y, dxyData] = await Promise.all([
      // VIX — use CBOE Volatility Index
      fetchAV({ function: "GLOBAL_QUOTE", symbol: "VIX" }, apiKey).catch(() => null),
      // Oil — WTI crude
      fetchAV({ function: "GLOBAL_QUOTE", symbol: "USO" }, apiKey).catch(() => null),
      // 2-Year Treasury Yield
      fetchAV({ function: "TREASURY_YIELD", interval: "daily", maturity: "2year" }, apiKey).catch(() => null),
      // 10-Year Treasury Yield
      fetchAV({ function: "TREASURY_YIELD", interval: "daily", maturity: "10year" }, apiKey).catch(() => null),
      // Dollar Index proxy (UUP ETF)
      fetchAV({ function: "GLOBAL_QUOTE", symbol: "UUP" }, apiKey).catch(() => null),
    ]);

    // Parse VIX
    const vixPrice = parseFloat((vixData as AVQuote)?.["Global Quote"]?.["05. price"] ?? "");

    // Parse Oil (USO ETF as WTI proxy)
    const oilPrice = parseFloat((oilData as AVQuote)?.["Global Quote"]?.["05. price"] ?? "");

    // Parse yield curve (2s10s spread)
    const y2 = parseFloat(((yield2Y as AVYield)?.data?.[0]?.value) ?? "");
    const y10 = parseFloat(((yield10Y as AVYield)?.data?.[0]?.value) ?? "");
    const yieldSpread = !isNaN(y2) && !isNaN(y10) ? y10 - y2 : null;

    // Parse DXY proxy
    const dxyPrice = parseFloat((dxyData as AVQuote)?.["Global Quote"]?.["05. price"] ?? "");
    const dxyChange = parseFloat((dxyData as AVQuote)?.["Global Quote"]?.["10. change percent"]?.replace("%", "") ?? "");

    const result = {
      vix: !isNaN(vixPrice) ? { value: vixPrice } : null,
      oil: !isNaN(oilPrice) ? { value: oilPrice } : null,
      yieldCurve: yieldSpread !== null ? {
        spread: yieldSpread,
        y2: y2,
        y10: y10,
      } : null,
      dxy: !isNaN(dxyPrice) ? {
        value: dxyPrice,
        changePercent: !isNaN(dxyChange) ? dxyChange : 0,
      } : null,
      fetchedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching macro data:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
