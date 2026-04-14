

# Add CAD/USD Coincident Signal

## Overview
Add the Canadian Dollar (CAD/USD) as a new coincident signal. Canada is a major US trading partner and commodity exporter — CAD strength/weakness reflects global risk appetite and commodity demand. A weakening CAD (stronger USD) signals risk-off; a strengthening CAD signals risk-on.

## Data Source
FRED series **DEXCAUS** — Canada / U.S. Foreign Exchange Rate (daily, CAD per 1 USD). A rising value means CAD is weakening (more CAD needed per USD). We compare current vs prior observation to determine direction.

## Scoring Logic
- **Bullish (+1)**: CAD strengthening (DEXCAUS falling > 0.5%)
- **Neutral (0)**: Stable (change within ±0.5%)  
- **Bearish (-1)**: CAD weakening (DEXCAUS rising > 0.5%)

## Changes

### 1. Edge Function (`supabase/functions/fetch-macro-data/index.ts`)
- Fetch `DEXCAUS` series (2 observations) alongside existing FRED calls
- Add `scoreCADUSD(current, previous)` function
- Add `cadusd` field to the response: `{ value, changePercent, asOf }`
- Add `cadusd` to `signalScores` and update `computeComposite` to include it at 1x weight
- Update `totalPossible` from 18 to 19

### 2. Frontend Types (`src/hooks/useMacroData.ts`)
- Add `cadusd` to `MacroAPIResponse` interface
- Add `scoreCADUSD` function
- Add `case "cadusd"` to `applyLiveData` switch

### 3. Signal Definition (`src/lib/macroSignals.ts`)
- Add `cadusd` signal to `getMockSignals()` as a coincident signal with weight 1
- Update regime dimension map — add `cadusd` to the "Rates / Dollar" dimension (alongside DXY and Oil)

### 4. Composite Weight Update
- Total possible weight increases from 18 to 19 (adding 1× coincident)
- Update both edge function and frontend `computeComposite`

