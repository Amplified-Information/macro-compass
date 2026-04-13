import { useMemo } from "react";
import { getMockSignals, computeComposite, CAPE_ELEVATED, SignalCategory } from "@/lib/macroSignals";
import { CompositeGauge } from "@/components/CompositeGauge";
import { SignalGroup } from "@/components/SignalGroup";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { CapeDampener } from "@/components/CapeDampener";
import { RegimeMap } from "@/components/RegimeMap";
import { Activity } from "lucide-react";

const CATEGORIES: SignalCategory[] = ["leading", "coincident", "sentiment"];

export default function Index() {
  const signals = useMemo(() => getMockSignals(), []);
  const result = useMemo(() => computeComposite(signals, CAPE_ELEVATED), [signals]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">Macro Regime Dashboard</h1>
              <p className="text-xs text-muted-foreground">Weighted composite signal · Risk regime detector</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Top section: Gauge + Breakdown */}
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <CompositeGauge result={result} />
          </div>
          <div className="lg:col-span-2">
            <ScoreBreakdown signals={signals} result={result} />
          </div>
        </div>

        {/* Regime Map */}
        <RegimeMap result={result} />

        {/* CAPE Dampener */}
        <CapeDampener />

        {/* Signal groups */}
        {CATEGORIES.map((cat) => (
          <SignalGroup
            key={cat}
            category={cat}
            signals={signals.filter((s) => s.category === cat)}
          />
        ))}
      </main>
    </div>
  );
}
