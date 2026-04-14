/**
 * fetch-edgar-data: Dedicated daily cron job for SEC EDGAR scrapers.
 * Fetches insider activity (Form 4) and EPS trends (XBRL) for large-cap CIKs,
 * then upserts results into the edgar_cache table.
 *
 * Triggered by pg_cron daily — NOT called on page load.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SEC_HEADERS = {
  "User-Agent": "MacroDashboard/1.0 (macro-dashboard@lovable.app)",
  "Accept-Encoding": "gzip, deflate",
  "Accept": "application/json, application/xml, text/xml, */*",
};

const LARGE_CAP_CIKS = [
  "0000320193", "0000789019", "0001652044", "0001018724", "0001326801",
  "0001045810", "0000078003", "0000320187", "0000732717", "0000093410",
  "0000034088", "0000858877", "0000886982", "0000019617", "0000070858",
  "0000050863", "0000004962", "0000066740", "0000018230", "0000310158",
];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ===================== INSIDER ACTIVITY (Form 4) =====================

interface InsiderTransaction {
  transactionCode: string;
  shares: number;
  pricePerShare: number;
  totalValue: number;
  acquiredOrDisposed: string;
}

function parseForm4Xml(xml: string): InsiderTransaction[] {
  const transactions: InsiderTransaction[] = [];
  const txPatterns = [
    /<nonDerivativeTransaction>([\s\S]*?)<\/nonDerivativeTransaction>/gi,
    /<derivativeTransaction>([\s\S]*?)<\/derivativeTransaction>/gi,
  ];
  for (const pattern of txPatterns) {
    let match;
    while ((match = pattern.exec(xml)) !== null) {
      const block = match[1];
      const codeMatch = block.match(/<transactionCode>(.*?)<\/transactionCode>/i);
      const code = codeMatch?.[1]?.trim() ?? "";
      if (code !== "P" && code !== "S") continue;
      const sharesMatch = block.match(/<transactionShares>\s*<value>([\d.]+)<\/value>/i);
      const shares = sharesMatch ? parseFloat(sharesMatch[1]) : 0;
      const priceMatch = block.match(/<transactionPricePerShare>\s*<value>([\d.]+)<\/value>/i);
      const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
      const adMatch = block.match(/<acquiredDisposedCode>\s*<value>([AD])<\/value>/i);
      const ad = adMatch?.[1] ?? (code === "P" ? "A" : "D");
      if (shares > 0) {
        transactions.push({ transactionCode: code, shares, pricePerShare: price, totalValue: shares * price, acquiredOrDisposed: ad });
      }
    }
  }
  return transactions;
}

async function fetchEdgarInsiderActivity() {
  console.log("EDGAR: Fetching Form 4 filings for large-cap CIKs...");
  let xmlUrls: string[] = [];

  for (let i = 0; i < LARGE_CAP_CIKS.length; i += 5) {
    const batch = LARGE_CAP_CIKS.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(async (cik) => {
        try {
          const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
          const res = await fetch(url, { headers: SEC_HEADERS });
          if (!res.ok) { await res.text(); return []; }
          const data = await res.json();
          const recent = data?.filings?.recent;
          if (!recent) return [];
          const urls: string[] = [];
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          for (let j = 0; j < (recent.form?.length ?? 0) && j < 50; j++) {
            if (recent.form[j] !== "4") continue;
            const filingDate = new Date(recent.filingDate[j]);
            if (filingDate < thirtyDaysAgo) break;
            const accession = recent.accessionNumber[j].replace(/-/g, "");
            const doc = recent.primaryDocument[j];
            if (doc) urls.push(`https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/${accession}/${doc}`);
          }
          return urls;
        } catch { return []; }
      })
    );
    xmlUrls.push(...results.flat());
    if (i + 5 < LARGE_CAP_CIKS.length) await sleep(600);
  }

  console.log(`EDGAR: Found ${xmlUrls.length} Form 4 XML URLs`);
  if (xmlUrls.length === 0) return null;

  let totalPurchaseValue = 0, totalSaleValue = 0, purchaseCount = 0, saleCount = 0, filingsParsed = 0;
  for (let i = 0; i < xmlUrls.length; i += 5) {
    const batch = xmlUrls.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(async (url) => {
        try {
          const res = await fetch(url, { headers: SEC_HEADERS });
          if (!res.ok) { await res.text(); return []; }
          return parseForm4Xml(await res.text());
        } catch { return []; }
      })
    );
    for (const txs of results) {
      if (txs.length > 0) filingsParsed++;
      for (const tx of txs) {
        if (tx.transactionCode === "P") { totalPurchaseValue += tx.totalValue; purchaseCount++; }
        else if (tx.transactionCode === "S") { totalSaleValue += tx.totalValue; saleCount++; }
      }
    }
    if (i + 5 < xmlUrls.length) await sleep(600);
  }

  const totalValue = totalPurchaseValue + totalSaleValue;
  const buyRatio = totalValue > 0 ? totalPurchaseValue / totalValue : 0.5;
  const score = buyRatio > 0.35 ? 1 : buyRatio >= 0.15 ? 0 : -1;

  const result = {
    totalPurchaseValue: Math.round(totalPurchaseValue),
    totalSaleValue: Math.round(totalSaleValue),
    purchaseCount, saleCount,
    buyRatio: Math.round(buyRatio * 1000) / 1000,
    filingsParsed, score, daysScanned: 30,
  };
  console.log(`EDGAR Insider: ${filingsParsed} filings, buy ratio ${buyRatio.toFixed(3)}, score ${score}`);
  return result;
}

// ===================== EARNINGS (XBRL EPS) =====================

async function fetchXbrlEps(cik: string): Promise<{ recent: number; prior: number } | null> {
  try {
    const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
    const res = await fetch(url, { headers: SEC_HEADERS });
    if (!res.ok) { await res.text(); return null; }
    const data = await res.json();
    const epsFact = data?.facts?.["us-gaap"]?.EarningsPerShareDiluted;
    if (!epsFact) return null;
    const entries: any[] = [];
    for (const unitKey in epsFact.units) entries.push(...epsFact.units[unitKey]);
    const quarterly = entries
      .filter((e: any) => e.form === "10-Q" || e.form === "10-K")
      .sort((a: any, b: any) => b.end.localeCompare(a.end));
    const seen = new Set<string>();
    const unique: any[] = [];
    for (const e of quarterly) { if (!seen.has(e.end)) { seen.add(e.end); unique.push(e); } }
    if (unique.length < 2) return null;
    return { recent: unique[0].val, prior: unique[1].val };
  } catch { return null; }
}

async function fetchEdgarEarningsRevisions() {
  console.log("EDGAR Earnings: Fetching XBRL EPS for large-caps...");
  let epsImproving = 0, epsDeclining = 0, epsStable = 0, companiesAnalyzed = 0;

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

  let recent8KCount = 0;
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const searchUrl = `https://efts.sec.gov/LATEST/search-index?q=%22Item+2.02%22&forms=8-K&dateRange=custom&startdt=${startDate.toISOString().slice(0, 10)}&enddt=${endDate.toISOString().slice(0, 10)}&from=0&size=1`;
    const res = await fetch(searchUrl, { headers: SEC_HEADERS });
    if (res.ok) { const data = await res.json(); recent8KCount = data?.hits?.total?.value ?? 0; } else { await res.text(); }
  } catch { /* ignore */ }

  const total = epsImproving + epsDeclining + epsStable;
  const improvingRatio = total > 0 ? epsImproving / total : 0.5;
  const decliningRatio = total > 0 ? epsDeclining / total : 0.5;
  const score = improvingRatio > 0.5 ? 1 : decliningRatio > 0.5 ? -1 : 0;

  const result = {
    epsImprovingCount: epsImproving, epsDecliningCount: epsDeclining, epsStableCount: epsStable,
    companiesAnalyzed, recentEarnings8K: recent8KCount,
    improvingRatio: Math.round(improvingRatio * 1000) / 1000, score,
  };
  console.log(`EDGAR Earnings: ${companiesAnalyzed} analyzed, improving ratio ${improvingRatio.toFixed(3)}, score ${score}`);
  return result;
}

// ===================== HANDLER =====================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const [insiderData, earningsData] = await Promise.all([
      fetchEdgarInsiderActivity().catch((e) => { console.error("Insider scraper failed:", e); return null; }),
      fetchEdgarEarningsRevisions().catch((e) => { console.error("Earnings scraper failed:", e); return null; }),
    ]);

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date().toISOString();
    const upserts = [];

    if (insiderData) {
      upserts.push(
        supabase.from("edgar_cache").upsert(
          { cache_key: "insider", data: insiderData, scraped_at: now },
          { onConflict: "cache_key" }
        )
      );
    }
    if (earningsData) {
      upserts.push(
        supabase.from("edgar_cache").upsert(
          { cache_key: "earnings", data: earningsData, scraped_at: now },
          { onConflict: "cache_key" }
        )
      );
    }

    await Promise.all(upserts);
    console.log(`EDGAR cache updated: insider=${!!insiderData}, earnings=${!!earningsData}`);

    return new Response(JSON.stringify({
      success: true,
      insider: insiderData ? "updated" : "failed",
      earnings: earningsData ? "updated" : "failed",
      scrapedAt: now,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("EDGAR cron error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
