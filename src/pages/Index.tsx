import { useMemo } from "react";
import { CAPE_ELEVATED, SignalCategory } from "@/lib/macroSignals";
import { useMacroData } from "@/hooks/useMacroData";
import { CompositeGauge } from "@/components/CompositeGauge";
import { SignalGroup } from "@/components/SignalGroup";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { CapeDampener } from "@/components/CapeDampener";
import { RegimeMap } from "@/components/RegimeMap";
import { CategoryRadar } from "@/components/CategoryRadar";
import { DeploymentSparkline } from "@/components/DeploymentSparkline";
import { TimeSlider } from "@/components/TimeSlider";
import { Activity, Wifi, WifiOff } from "lucide-react";

const CATEGORIES: SignalCategory[] = ["leading", "coincident", "sentiment"];

export default function Index() {
  const {
    signals, result, isLoading, isLive, fetchedAt,
    snapshots, selectedSnapshotIdx, setSelectedSnapshotIdx, isViewingHistory,
  } = useMacroData();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className={`border-b ${isViewingHistory ? "border-signal-neutral/30" : "border-border"}`}>
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
          <div className="flex items-center gap-3">
            {isViewingHistory && (
              <span className="text-xs font-mono px-2 py-1 rounded-full bg-signal-neutral/10 text-signal-neutral border border-signal-neutral/30">
                Viewing Historical Snapshot
              </span>
            )}
            <div className={`flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded-full border ${
              isLive ? "border-signal-bullish/30 text-signal-bullish bg-signal-bullish/10" :
              isLoading ? "border-signal-neutral/30 text-signal-neutral bg-signal-neutral/10" :
              "border-border text-muted-foreground"
            }`}>
              {isLive ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isLoading ? "Fetching…" : isLive ? "Live" : "Mock data"}
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {fetchedAt
                ? new Date(fetchedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Time Slider */}
        <TimeSlider
          snapshots={snapshots}
          selectedIdx={selectedSnapshotIdx}
          onSelect={setSelectedSnapshotIdx}
        />

        {/* CAPE Banner */}
        <CapeDampener />

        {/* Two-column: Verdict (left) | Evidence (right) */}
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-6">
            <CompositeGauge result={result} />
            <div className="grid gap-6 sm:grid-cols-2">
              <CategoryRadar signals={signals} />
              <DeploymentSparkline result={result} />
            </div>
          </div>
          <div className="lg:col-span-2">
            <ScoreBreakdown signals={signals} result={result} />
          </div>
        </div>

        {/* Regime Map */}
        <RegimeMap result={result} />

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
