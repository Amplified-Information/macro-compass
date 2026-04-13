import { MacroSnapshot } from "@/hooks/useMacroData";
import { Slider } from "@/components/ui/slider";
import { Clock, RotateCcw } from "lucide-react";

interface Props {
  snapshots: MacroSnapshot[];
  selectedIdx: number | null;
  onSelect: (idx: number | null) => void;
}

export function TimeSlider({ snapshots, selectedIdx, onSelect }: Props) {
  if (snapshots.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-mono">No historical snapshots yet — data is saved each time the dashboard loads.</span>
      </div>
    );
  }

  const isLive = selectedIdx === null;
  const maxIdx = snapshots.length - 1;
  const sliderValue = isLive ? -1 : selectedIdx;

  const currentLabel = isLive
    ? "Live"
    : new Date(snapshots[selectedIdx!].created_at).toLocaleString("en-US", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      });

  const currentScore = isLive ? null : snapshots[selectedIdx!].composite_score;
  const currentRegime = isLive ? null : snapshots[selectedIdx!].regime;

  const oldest = snapshots[snapshots.length - 1];
  const newest = snapshots[0];

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Time Machine</span>
          {!isLive && (
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-signal-neutral/10 text-signal-neutral border border-signal-neutral/30">
              Historical
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {currentScore !== null && (
            <span className={`text-xs font-mono font-bold ${
              currentScore > 0 ? "text-signal-bullish" : currentScore < 0 ? "text-signal-bearish" : "text-signal-neutral"
            }`}>
              {currentScore > 0 ? "+" : ""}{Number(currentScore).toFixed(4)} · {currentRegime}
            </span>
          )}
          <span className="text-xs font-mono text-foreground font-semibold">{currentLabel}</span>
          {!isLive && (
            <button
              onClick={() => onSelect(null)}
              className="flex items-center gap-1 text-xs font-mono px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Back to Live
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Slider
          min={-1}
          max={maxIdx}
          step={1}
          value={[sliderValue]}
          onValueChange={([v]) => {
            onSelect(v === -1 ? null : v);
          }}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
          <span>Live (Now)</span>
          <span>{snapshots.length} snapshots</span>
          <span>
            {new Date(oldest.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
      </div>

      {/* Mini sparkline of composite scores */}
      {snapshots.length > 1 && (
        <HistorySparkline snapshots={snapshots} selectedIdx={selectedIdx} />
      )}
    </div>
  );
}

function HistorySparkline({ snapshots, selectedIdx }: { snapshots: MacroSnapshot[]; selectedIdx: number | null }) {
  const scores = [...snapshots].reverse().map((s) => Number(s.composite_score));
  const min = Math.min(...scores, -1);
  const max = Math.max(...scores, 1);
  const range = max - min || 1;
  const w = 400;
  const h = 30;

  const points = scores.map((v, i) => {
    const x = (i / (scores.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });

  // Zero line
  const zeroY = h - ((0 - min) / range) * h;

  // Selected marker position
  const selIdx = selectedIdx !== null ? snapshots.length - 1 - selectedIdx : null;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none">
      {/* Zero line */}
      <line x1="0" y1={zeroY} x2={w} y2={zeroY} stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" strokeDasharray="4 2" opacity="0.3" />
      {/* Area */}
      <polygon
        points={`0,${h} ${points.join(" ")} ${w},${h}`}
        fill="hsl(var(--primary))"
        fillOpacity="0.08"
      />
      {/* Line */}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Selected dot */}
      {selIdx !== null && (
        <circle
          cx={(selIdx / (scores.length - 1)) * w}
          cy={h - ((scores[selIdx] - min) / range) * h}
          r="4"
          fill="hsl(var(--signal-neutral))"
          stroke="hsl(var(--card))"
          strokeWidth="2"
        />
      )}
      {/* Latest dot */}
      <circle
        cx={w}
        cy={h - ((scores[scores.length - 1] - min) / range) * h}
        r="3"
        fill="hsl(var(--primary))"
      />
    </svg>
  );
}
