

# Enhanced Regime Detection with Transition Awareness

## What We're Building

The current `detectRegime()` in `MacroRegimeIndicator.tsx` uses a simple binary split (growth up/down, inflation up/down) to pick one of four quadrants. This misses the nuance you described — "late reflation tilting toward stagflation" — where the economy sits on a fault line between regimes.

We'll upgrade the regime indicator to:

1. **Show the primary regime AND a secondary "tilting toward" regime** when scores are near the boundary
2. **Add a regime confidence meter** — how deeply seated in the current quadrant vs. how close to a transition
3. **Generate a dynamic narrative summary** (like "Late reflation with rising stagflation risk") derived from the signal data
4. **Compute growth and inflation as continuous axes** (not just binary up/down) so we can detect "decelerating but still positive" growth vs. "contracting"

All of this is automated — it derives entirely from the existing 15 live signals.

## Technical Plan

### 1. Upgrade `MacroRegimeIndicator.tsx` — Regime Detection Logic

Replace the binary `detectRegime()` with a richer function that returns:
- `primary`: the dominant regime
- `secondary`: the regime it's tilting toward (null if firmly seated)
- `confidence`: 0–1 how firmly in the primary quadrant
- `growthScore`: continuous -1 to +1 (not binary)
- `inflationScore`: continuous -1 to +1
- `narrative`: auto-generated text summary

**Growth axis** (expanded inputs): yield curve, CFNAI, earnings, credit spreads, breadth, insider activity — weighted average gives a continuous growth score.

**Inflation axis** (expanded inputs): inflation pass-through, oil momentum — inverted so positive = rising inflation.

**Transition detection**: When either axis score is within ±0.15 of zero, the regime is "transitional" — we show both the primary and the adjacent quadrant it's tilting toward. Confidence = distance from the zero boundary.

### 2. Update the Visual Cards

- The active regime card gets a **confidence bar** (e.g., 35% confidence = shallow, 90% = firmly seated)
- When transitional, the secondary regime card gets a subtle highlight with a "Tilting toward" label and a pulsing amber indicator
- Add a **narrative banner** above the four cards: a single sentence like "Late reflation — growth decelerating, inflation re-accelerating on energy shock. Stagflation risk rising."

### 3. Dynamic Narrative Generator

A pure function that takes growthScore, inflationScore, and individual signal data to produce context-aware text:
- References specific drivers (e.g., "oil +21% in 30d", "CFNAI near zero", "credit spreads still tight")
- Uses thresholds to pick qualifiers: "early/mid/late" for each regime based on how far along each axis
- Flags the key variable to watch (e.g., "Watch: oil prices over next 60–90 days")

### 4. Edge Function — Regime Metadata in Snapshot

Add `regimeDetail` to the snapshot response so the narrative and transition state are persisted and visible in historical snapshots:
```
regimeDetail: {
  primary: "reflation",
  secondary: "stagflation",
  confidence: 0.35,
  growthScore: 0.12,
  inflationScore: -0.55,
  narrative: "Late reflation..."
}
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/MacroRegimeIndicator.tsx` | New detection logic, confidence bar, transition indicator, narrative banner |
| `supabase/functions/fetch-macro-data/index.ts` | Add `regimeDetail` object to response and snapshot |
| `src/hooks/useMacroData.ts` | Pass through `regimeDetail` from API response |

## What This Doesn't Change

- The four regime quadrants stay the same (Goldilocks / Reflation / Stagflation / Deflation)
- The composite score, signal weights, and deployment logic are untouched
- The Regime Signals cards (Inflation Pressure, Growth Momentum, etc.) remain independent

