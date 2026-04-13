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

// ===================== SEC EDGAR FORM 4 INSIDER SCRAPER =====================

const SEC_HEADERS = {
  "User-Agent": "MacroDashboard/1.0 (macro-dashboard@lovable.app)",
  "Accept-Encoding": "gzip, deflate",
  "Accept": "application/json, application/xml, text/xml, */*",
};

interface InsiderTransaction {
  transactionCode: string; // P=Purchase, S=Sale, M=Exercise, G=Gift, A=Grant
  shares: number;
  pricePerShare: number;
  totalValue: number;
  acquiredOrDisposed: string; // A or D
}

interface InsiderResult {
  totalPurchaseValue: number;
  totalSaleValue: number;
  purchaseCount: number;
  saleCount: number;
  buyRatio: number; // purchases / (purchases + sales) by value
  filingsParsed: number;
  score: number;
  daysScanned: number;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseForm4Xml(xml: string): InsiderTransaction[] {
  const transactions: InsiderTransaction[] = [];

  // Match both non-derivative and derivative transactions
  // Non-derivative: <nonDerivativeTransaction>...</nonDerivativeTransaction>
  // We parse transactionCode, shares, pricePerShare, acquiredOrDisposed
  const txPatterns = [
    /<nonDerivativeTransaction>([\s\S]*?)<\/nonDerivativeTransaction>/gi,
    /<derivativeTransaction>([\s\S]*?)<\/derivativeTransaction>/gi,
  ];

  for (const pattern of txPatterns) {
    let match;
    while ((match = pattern.exec(xml)) !== null) {
      const block = match[1];

      // Transaction code
      const codeMatch = block.match(/<transactionCode>(.*?)<\/transactionCode>/i);
      const code = codeMatch?.[1]?.trim() ?? "";

      // Only care about P (Purchase) and S (Sale)
      if (code !== "P" && code !== "S") continue;

      // Shares
      const sharesMatch = block.match(
        /<transactionShares>\s*<value>([\d.]+)<\/value>/i
      );
      const shares = sharesMatch ? parseFloat(sharesMatch[1]) : 0;

      // Price per share
      const priceMatch = block.match(
        /<transactionPricePerShare>\s*<value>([\d.]+)<\/value>/i
      );
      const price = priceMatch ? parseFloat(priceMatch[1]) : 0;

      // Acquired or Disposed
      const adMatch = block.match(
        /<acquiredDisposedCode>\s*<value>([AD])<\/value>/i
      );
      const ad = adMatch?.[1] ?? (code === "P" ? "A" : "D");

      if (shares > 0) {
        transactions.push({
          transactionCode: code,
          shares,
          pricePerShare: price,
          totalValue: shares * price,
          acquiredOrDisposed: ad,
        });
      }
    }
  }

  return transactions;
}

async function fetchEdgarInsiderActivity(): Promise<InsiderResult | null> {
  try {
    // Step 1: Query EDGAR EFTS full-text search for recent Form 4 filings
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = endDate.toISOString().slice(0, 10);

    const searchUrl = `https://efts.sec.gov/LATEST/search-index?q=&forms=4&dateRange=custom&startdt=${startStr}&enddt=${endStr}&from=0&size=40`;

    console.log("EDGAR: Fetching recent Form 4 index...");
    const searchRes = await fetch(searchUrl, { headers: SEC_HEADERS });

    let xmlUrls: string[] = [];

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.hits?.hits) {
        xmlUrls = searchData.hits.hits
          .map((h: any) => {
            // _id format: "accession-number:filename.xml"
            // _source.adsh: "0001452301-26-000008"
            const adsh = h._source?.adsh;
            const idParts = h._id?.split(":");
            const filename = idParts?.[1];
            if (adsh && filename) {
              const adshPath = adsh.replace(/-/g, "");
              // CIK from the first entry
              const ciks = h._source?.ciks;
              const cik = ciks?.[0];
              if (cik) {
                return `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/${adshPath}/${filename}`;
              }
            }
            return null;
          })
          .filter(Boolean)
          .slice(0, 30);
      }
    } else {
      const errText = await searchRes.text();
      console.log("EDGAR: EFTS error:", searchRes.status, errText.substring(0, 200));
    }

    console.log(`EDGAR: Found ${xmlUrls.length} XML URLs to fetch`);

    if (xmlUrls.length === 0) {
      return null;
    }

    // Step 2: Fetch and parse Form 4 XMLs in batches
    const batchSize = 5;
    let totalPurchaseValue = 0;
    let totalSaleValue = 0;
    let purchaseCount = 0;
    let saleCount = 0;
    let filingsParsed = 0;

    for (let i = 0; i < xmlUrls.length; i += batchSize) {
      const batch = xmlUrls.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (url) => {
          try {
            const res = await fetch(url, { headers: SEC_HEADERS });
            if (!res.ok) { await res.text(); return []; }
            const xml = await res.text();
            return parseForm4Xml(xml);
          } catch {
            return [];
          }
        })
      );

      for (const txs of results) {
        if (txs.length > 0) filingsParsed++;
        for (const tx of txs) {
          if (tx.transactionCode === "P") {
            totalPurchaseValue += tx.totalValue;
            purchaseCount++;
          } else if (tx.transactionCode === "S") {
            totalSaleValue += tx.totalValue;
            saleCount++;
          }
        }
      }

      if (i + batchSize < xmlUrls.length) await sleep(600);
    }

    const totalValue = totalPurchaseValue + totalSaleValue;
    const buyRatio = totalValue > 0 ? totalPurchaseValue / totalValue : 0.5;

    // Score: High buy ratio = insiders buying = bullish
    // > 0.35 buy ratio is notable (normally insiders sell more than buy)
    let score: number;
    if (buyRatio > 0.35) score = 1;       // Unusual buying
    else if (buyRatio >= 0.15) score = 0;  // Normal range
    else score = -1;                       // Heavy selling

    const result: InsiderResult = {
      totalPurchaseValue: Math.round(totalPurchaseValue),
      totalSaleValue: Math.round(totalSaleValue),
      purchaseCount,
      saleCount,
      buyRatio: Math.round(buyRatio * 1000) / 1000,
      filingsParsed,
      score,
      daysScanned: 30,
    };

    console.log(`EDGAR: Parsed ${filingsParsed} filings. Purchases: ${purchaseCount} ($${Math.round(totalPurchaseValue/1000)}k), Sales: ${saleCount} ($${Math.round(totalSaleValue/1000)}k), Buy ratio: ${buyRatio.toFixed(3)}, Score: ${score}`);

    return result;
  } catch (error) {
    console.error("EDGAR scraper error:", error);
    return null;
  }
}

function scoreInsider(buyRatio: number): number {
  if (buyRatio > 0.35) return 1;
  if (buyRatio >= 0.15) return 0;
  return -1;
}

// ===================== EDGAR EARNINGS REVISIONS SCRAPER =====================

// Large-cap CIKs for XBRL EPS trend analysis
const LARGE_CAP_CIKS = [
  "0000320193", // AAPL
  "0000789019", // MSFT
  "0001652044", // GOOG
  "0001018724", // AMZN
  "0001326801", // META
  "0001045810", // NVDA
  "0000078003", // PFE
  "0000320187", // JNJ (actually J&J)
  "0000732717", // UNH
  "0000093410", // CVX
  "0000034088", // XOM
  "0000858877", // HD
  "0000886982", // GS
  "0000019617", // JPM
  "0000070858", // BAC
  "0000050863", // INTC
  "0000004962", // AXP
  "0000066740", // MMM
  "0000018230", // CAT
  "0000310158", // DIS
];

interface EarningsResult {
  epsImprovingCount: number;
  epsDecliningCount: number;
  epsStableCount: number;
  companiesAnalyzed: number;
  recentEarnings8K: number;
  improvingRatio: number;
  score: number;
}

async function fetchXbrlEps(cik: string): Promise<{ recent: number; prior: number } | null> {
  try {
    const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
    const res = await fetch(url, { headers: SEC_HEADERS });
    if (!res.ok) { await res.text(); return null; }
    const data = await res.json();

    const epsFact = data?.facts?.["us-gaap"]?.EarningsPerShareDiluted;
    if (!epsFact) return null;

    const units = epsFact.units;
    const entries: any[] = [];
    for (const unitKey in units) {
      entries.push(...units[unitKey]);
    }

    // Filter to quarterly filings (10-Q and 10-K with quarterly period)
    // Get entries with unique end dates, preferring shorter durations (quarterly)
    const quarterly = entries
      .filter((e: any) => e.form === "10-Q" || e.form === "10-K")
      .sort((a: any, b: any) => b.end.localeCompare(a.end));

    // Deduplicate by end date, take shortest duration (most likely single quarter)
    const seen = new Set<string>();
    const unique: any[] = [];
    for (const e of quarterly) {
      if (!seen.has(e.end)) {
        seen.add(e.end);
        unique.push(e);
      }
    }

    if (unique.length < 2) return null;

    return {
      recent: unique[0].val,
      prior: unique[1].val,
    };
  } catch {
    return null;
  }
}

async function fetchEdgarEarningsRevisions(): Promise<EarningsResult | null> {
  try {
    // Part 1: XBRL EPS trends for large-caps
    console.log("EDGAR Earnings: Fetching XBRL EPS for large-caps...");

    let epsImproving = 0;
    let epsDeclining = 0;
    let epsStable = 0;
    let companiesAnalyzed = 0;

    // Fetch in batches of 5 to respect SEC rate limits
    for (let i = 0; i < LARGE_CAP_CIKS.length; i += 5) {
      const batch = LARGE_CAP_CIKS.slice(i, i + 5);
      const results = await Promise.all(batch.map((cik) => fetchXbrlEps(cik)));

      for (const r of results) {
        if (r !== null) {
          companiesAnalyzed++;
          const changePct = r.prior !== 0 ? ((r.recent - r.prior) / Math.abs(r.prior)) * 100 : 0;
          if (changePct > 5) epsImproving++;
          else if (changePct < -5) epsDeclining++;
          else epsStable++;
        }
      }

      if (i + 5 < LARGE_CAP_CIKS.length) await sleep(600);
    }

    // Part 2: Count recent 8-K earnings announcements (Item 2.02)
    let recent8KCount = 0;
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const startStr = startDate.toISOString().slice(0, 10);
      const endStr = endDate.toISOString().slice(0, 10);

      const searchUrl = `https://efts.sec.gov/LATEST/search-index?q=%22Item+2.02%22&forms=8-K&dateRange=custom&startdt=${startStr}&enddt=${endStr}&from=0&size=1`;
      const res = await fetch(searchUrl, { headers: SEC_HEADERS });
      if (res.ok) {
        const data = await res.json();
        recent8KCount = data?.hits?.total?.value ?? 0;
      } else {
        await res.text();
      }
    } catch { /* ignore */ }

    const total = epsImproving + epsDeclining + epsStable;
    const improvingRatio = total > 0 ? epsImproving / total : 0.5;
    const decliningRatio = total > 0 ? epsDeclining / total : 0.5;

    // Score: net improving vs declining
    let score: number;
    if (improvingRatio > 0.5) score = 1;        // Most companies improving
    else if (decliningRatio > 0.5) score = -1;   // Most companies declining
    else score = 0;                               // Mixed

    const result: EarningsResult = {
      epsImprovingCount: epsImproving,
      epsDecliningCount: epsDeclining,
      epsStableCount: epsStable,
      companiesAnalyzed,
      recentEarnings8K: recent8KCount,
      improvingRatio: Math.round(improvingRatio * 1000) / 1000,
      score,
    };

    console.log(`EDGAR Earnings: ${companiesAnalyzed} companies analyzed. Improving: ${epsImproving}, Declining: ${epsDeclining}, Stable: ${epsStable}. Recent 8-Ks: ${recent8KCount}. Score: ${score}`);

    return result;
  } catch (error) {
    console.error("EDGAR Earnings scraper error:", error);
    return null;
  }
}

// ===================== END EDGAR EARNINGS SCRAPER =====================

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
  const spread = rspReturnPct - spyReturnPct;
  if (spread > 1) return 1;
  if (spread >= -1) return 0;
  return -1;
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
    // All fetches in parallel (EDGAR runs concurrently with FRED/AV)
    const [
      fredYieldSpread, fredCreditSpread, fredOil,
      fredVIX, fredPMI, fredSentiment, fredDXY,
      rspPrices, spyPrices,
      insiderData, earningsData,
    ] = await Promise.all([
      fetchFRED("T10Y2Y", fredKey).catch(() => null),
      fetchFRED("BAMLH0A0HYM2", fredKey).catch(() => null),
      fetchFRED("DCOILWTICO", fredKey).catch(() => null),
      fetchFRED("VIXCLS", fredKey).catch(() => null),
      fetchFRED("NAPM", fredKey).catch(() => null),
      fetchFRED("UMCSENT", fredKey).catch(() => null),
      fetchFREDSeries("DTWEXBGS", fredKey, 30).catch(() => []),
      avKey ? fetchAVDaily("RSP", avKey).catch(() => []) : Promise.resolve([]),
      avKey ? fetchAVDaily("SPY", avKey).catch(() => []) : Promise.resolve([]),
      fetchEdgarInsiderActivity().catch(() => null),
      fetchEdgarEarningsRevisions().catch(() => null),
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
      insider: insiderData as InsiderResult | null,
      fetchedAt: new Date().toISOString(),
    };

    // Compute signal scores
    const signalScores: Record<string, number> = {
      // Still mock (no free public API):
      "earnings": 1,
    };
    if (insiderData) signalScores["insider"] = insiderData.score;
    else signalScores["insider"] = 0;
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
