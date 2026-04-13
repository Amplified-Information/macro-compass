

## Plan: Add NFCI Signal + 5-Axis Regime Radar

### What changes

**1. Edge Function — fetch NFCI from FRED**
- Add `NFCI` to the parallel FRED fetch calls
- Add scoring function: `scoreNFCI(v)` → Bullish (< -0.5), Neutral (-0.5 to 0), Bearish (0 to 0.5), Crisis (> 0.5)
- Include `nfci` in the API response and `signalScores`
- Update `computeComposite` to include NFCI as a leading signal (weight 2), increasing total possible from 16 to 18

**2. Frontend Signal Definition**
- Add NFCI as a 13th signal in `getMockSignals()` in `macroSignals.ts` (category: "leading", weight: 2)
- Add tooltip explaining NFCI (105 financial indicators, FRED series NFCI)
- Update `MacroAPIResponse` interface in `useMacroData.ts` to include `nfci: { value: number } | null`
- Add `case "nfci"` in `applyLiveData` with scoring and description

**3. Compute 5 Independent Sub-Scores**
- Create a new utility in `macroSignals.ts` that groups the 13 signals into 5 regime dimensions:
  - **Macro Momentum**: Yield Curve, PMI (CFNAI), Earnings Revisions
  - **Volatility**: VIX
  - **Trend**: Breadth, Seasonality
  - **Liquidity**: M2, NFCI, Credit Spreads
  - **Rates/Dollar**: DXY, Oil
- Each dimension gets a sub-score: average of its constituent signal scores (-1 to +1)
- Export a `computeRegimeDimensions(signals)` function returning `{ label, score }[]`

**4. Regime Radar Component**
- Create `src/components/RegimeRadar.tsx` — a 5-axis Recharts `RadarChart` showing the independent dimension sub-scores
- Axes: Macro Momentum, Volatility, Trend, Liquidity, Rates
- Style consistent with existing `CategoryRadar` (same color scheme, same sizing)

**5. Update RegimeMap + Index Layout**
- Add the `RegimeRadar` alongside the existing linear regime bar inside `RegimeMap.tsx` (bar stays, radar added below/beside it)
- Pass signals to `RegimeMap` so it can compute dimensions
- Update `Index.tsx` to pass `signals` prop to `RegimeMap`

### Files modified
- `supabase/functions/fetch-macro-data/index.ts` — NFCI fetch + scoring + composite update
- `src/lib/macroSignals.ts` — NFCI mock signal + `computeRegimeDimensions()` + updated weights
- `src/hooks/useMacroData.ts` — NFCI in API interface + `applyLiveData` case
- `src/components/RegimeRadar.tsx` — new 5-axis radar component
- `src/components/RegimeMap.tsx` — integrate radar, accept signals prop
- `src/pages/Index.tsx` — pass signals to RegimeMap

