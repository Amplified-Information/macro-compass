

## Plan: Add Last-Updated Timestamps to Dashboard and Each Metric

### Problem
The dashboard shows a single `fetchedAt` time in the header but doesn't indicate when each individual metric was last updated. FRED data series have their own observation dates (which can lag days/weeks), and SEC data has its own freshness.

### Approach

**1. Edge Function — return per-metric dates**
- Modify `fetchFRED` to return both value AND observation date (not just the value string)
- Include an `asOf` date field in each metric object in the API response (e.g., `vix: { value: 26.1, asOf: "2026-04-11" }`)
- For EDGAR-based signals (insider, earnings), include the date range scanned
- For seasonality, use current date

**2. API Response Interface (`useMacroData.ts`)**
- Add optional `asOf?: string` to each metric in `MacroAPIResponse` (vix, oil, yieldCurve, creditSpread, m2, dxy, pmi, sentiment, nfci)
- Add `asOf` fields to insider/earnings interfaces

**3. MacroSignal type (`macroSignals.ts`)**
- Add `asOf?: string` to the `MacroSignal` interface

**4. Apply live data (`useMacroData.ts`)**
- Pass through `asOf` from each API response field into the signal object in `applyLiveData`

**5. SignalCard UI (`SignalCard.tsx`)**
- Display a small "Updated: Apr 11" or "as of Apr 11" line below the source, using relative or short date formatting

**6. Dashboard header (`Index.tsx`)**
- Already shows `fetchedAt` time — enhance to show "Data fetched: Apr 14, 2:30 PM" more prominently

### Files modified
- `supabase/functions/fetch-macro-data/index.ts` — return observation dates per metric
- `src/lib/macroSignals.ts` — add `asOf` to `MacroSignal` interface
- `src/hooks/useMacroData.ts` — update `MacroAPIResponse` types, pass `asOf` through in `applyLiveData`
- `src/components/SignalCard.tsx` — render per-metric last-updated date

