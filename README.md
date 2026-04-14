# Macro Regime Dashboard

A real-time macroeconomic regime detection and portfolio deployment dashboard. Aggregates 15+ live economic signals into a weighted composite score, detects the current macro regime, and recommends equity deployment levels.

## What It Does

- **Composite Signal Scoring** — Weighted blend of leading, coincident, and sentiment indicators (yield curve, PMI, credit spreads, earnings revisions, insider activity, etc.) normalized to -1 → +1.
- **Regime Detection** — Classifies the economy into one of four quadrants (Goldilocks, Reflation, Stagflation, Deflation) with transition awareness and confidence scoring.
- **Dynamic Narrative** — Auto-generates plain-English summaries like *"Late reflation — growth decelerating, inflation re-accelerating. Stagflation risk rising."*
- **CAPE Dampener** — Applies a valuation haircut when Shiller CAPE is elevated, reducing deployment recommendations.
- **Oil → Inflation Pass-Through** — Tracks energy price shocks and their estimated CPI impact with 3–6 month lag modeling.
- **CB Balance Sheets** — Week-over-week QE/QT tracking from Fed (WALCL) and Bank of Canada total assets.
- **Portfolio Response Map** — Maps each regime to recommended asset allocation tilts.
- **Historical Snapshots** — Persists daily snapshots with full signal state, regime detail, and composite scores for time-series review.

## Architecture

| Layer | Stack |
|-------|-------|
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui · Recharts |
| Backend | Lovable Cloud (Supabase) — Edge Functions, PostgreSQL |
| Data Sources | FRED API, Bank of Canada Valet API, Alpha Vantage |

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/macroSignals.ts` | Signal definitions, weights, composite scoring logic |
| `src/components/MacroRegimeIndicator.tsx` | Regime detection (continuous axes, transition detection, narrative generator) |
| `src/components/InflationWidget.tsx` | Oil → CPI pass-through tracker with explainer |
| `src/hooks/useMacroData.ts` | Data fetching, snapshot navigation, live data hydration |
| `supabase/functions/fetch-macro-data/index.ts` | Edge function — fetches all data sources, computes signals, persists snapshots |
| `src/pages/Index.tsx` | Main dashboard layout |

## Signals Tracked

**Leading (2×)** — Yield curve, credit spreads, M2, NFCI, insider activity, oil, inflation pass-through, CB balance sheets

**Coincident (1×)** — VIX, CFNAI, DXY, EPS trends, CAD/USD, market breadth

**Sentiment (0.5×)** — Consumer sentiment (UMich), seasonality

## Deployment Logic

| Composite Score | Regime | Equity Deployment |
|----------------|--------|-------------------|
| > 0.5 | Full | 100% |
| 0 to 0.5 | Half | 50% |
| -0.5 to 0 | Minimal | 25% |
| < -0.5 | Cash | 0% |

## Development

```bash
npm install
npm run dev
```

The backend edge function runs on Lovable Cloud and is deployed automatically.
