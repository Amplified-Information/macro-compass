interface SignalSparklineProps {
  /** Score history from oldest to newest, values -1 | 0 | 1 */
  scores: number[];
}

export function SignalSparkline({ scores }: SignalSparklineProps) {
  if (scores.length < 2) return null;

  const height = 28;
  const padding = 2;

  const n = scores.length;

  // Map score (-1..1) to y (top = bullish, bottom = bearish)
  const yForScore = (s: number) => padding + ((1 - s) / 2) * (height - padding * 2);
  const zeroY = yForScore(0);

  // Current score determines line color
  const last = scores[scores.length - 1];
  const strokeColor = last > 0
    ? "var(--signal-bullish)"
    : last < 0
      ? "var(--signal-bearish)"
      : "var(--signal-neutral)";

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className="w-full"
    >
      {/* Neutral zero line */}
      <line
        x1={0}
        y1={zeroY}
        x2={100}
        y2={zeroY}
        stroke="currentColor"
        strokeOpacity={0.1}
        strokeDasharray="2 2"
      />
      {/* Fill area relative to zero line */}
      <polygon
        points={buildFillPoints(scores, n, padding, height, zeroY)}
        fill={strokeColor}
        fillOpacity={0.08}
      />
      {/* Trend line */}
      <polyline
        points={buildLinePoints(scores, n, padding, height)}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* Current value dot */}
      <circle
        cx={100}
        cy={yForScore(last)}
        r={2.5}
        fill={strokeColor}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function buildLinePoints(scores: number[], n: number, padding: number, height: number): string {
  const yForScore = (s: number) => padding + ((1 - s) / 2) * (height - padding * 2);
  return scores.map((s, i) => `${(i / (n - 1)) * 100},${yForScore(s)}`).join(" ");
}

function buildFillPoints(scores: number[], n: number, padding: number, height: number, zeroY: number): string {
  const yForScore = (s: number) => padding + ((1 - s) / 2) * (height - padding * 2);
  const linePoints = scores.map((s, i) => `${(i / (n - 1)) * 100},${yForScore(s)}`).join(" ");
  // Close polygon back to zero line (not bottom of SVG)
  return `0,${zeroY} ${linePoints} ${((n - 1) / (n - 1)) * 100},${zeroY}`;
}
