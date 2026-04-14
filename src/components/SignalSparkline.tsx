interface SignalSparklineProps {
  /** Score history from oldest to newest, values -1 | 0 | 1 */
  scores: number[];
}

export function SignalSparkline({ scores }: SignalSparklineProps) {
  if (scores.length < 2) return null;

  const width = 120;
  const height = 28;
  const padding = 2;

  const n = scores.length;
  const xStep = (width - padding * 2) / (n - 1);

  // Map score (-1..1) to y (top = bullish, bottom = bearish)
  const yForScore = (s: number) => padding + ((1 - s) / 2) * (height - padding * 2);

  const points = scores.map((s, i) => `${padding + i * xStep},${yForScore(s)}`).join(" ");

  // Current score determines line color
  const last = scores[scores.length - 1];
  const strokeColor = last > 0
    ? "var(--signal-bullish)"
    : last < 0
      ? "var(--signal-bearish)"
      : "var(--signal-neutral)";

  // Fill gradient from line to bottom
  const fillPoints = `${padding},${yForScore(scores[0])} ${points} ${padding + (n - 1) * xStep},${height - padding} ${padding},${height - padding}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ maxWidth: width }}
    >
      {/* Neutral zero line */}
      <line
        x1={padding}
        y1={yForScore(0)}
        x2={width - padding}
        y2={yForScore(0)}
        stroke="currentColor"
        strokeOpacity={0.1}
        strokeDasharray="2 2"
      />
      {/* Fill area */}
      <polygon
        points={fillPoints}
        fill={strokeColor}
        fillOpacity={0.08}
      />
      {/* Trend line */}
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current value dot */}
      <circle
        cx={padding + (n - 1) * xStep}
        cy={yForScore(last)}
        r={2.5}
        fill={strokeColor}
      />
    </svg>
  );
}
