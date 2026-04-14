import { AlertTriangle, Shield, ChevronDown } from "lucide-react";
import { useState } from "react";

interface CapeDampenerProps {
  capeValue: number;
  capeElevated: boolean;
  capeAsOf?: string | null;
}

export function CapeDampener({ capeValue, capeElevated, capeAsOf }: CapeDampenerProps) {
  const [expanded, setExpanded] = useState(false);
  const asOfLabel = capeAsOf
    ? new Date(capeAsOf + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  const explainer = (
    <div className={`overflow-hidden transition-all duration-300 ${expanded ? "max-h-96 mt-3" : "max-h-0"}`}>
      <div className="border-t border-border/30 pt-3 space-y-2 text-xs text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">What is CAPE?</span>{" "}
          The Cyclically Adjusted Price-to-Earnings ratio (Shiller PE) divides the S&P 500 price by 
          the average of 10 years of inflation-adjusted earnings. It smooths out business-cycle noise 
          to gauge whether stocks are cheap or expensive relative to long-term fundamentals.
        </p>
        <p>
          <span className="font-semibold text-foreground">Why 30× as the threshold?</span>{" "}
          The long-run CAPE average is ~17×. Readings above 30× have historically preceded lower 
          forward 10-year returns. At these levels, prices embed high growth expectations that may 
          not materialize, increasing downside risk.
        </p>
        <p>
          <span className="font-semibold text-foreground">What does the dampener do?</span>{" "}
          When CAPE exceeds 30×, the system caps maximum capital deployment at 75% even if every 
          other signal is bullish. This is a valuation guardrail — it doesn't predict crashes, but 
          it enforces discipline when the market is priced for perfection.
        </p>
        <p className="opacity-60">
          Source: Robert Shiller's dataset (Yale). Updated monthly.
          {asOfLabel && <> Data as of {asOfLabel}.</>}
        </p>
      </div>
    </div>
  );

  if (!capeElevated) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-secondary">
            <Shield className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-foreground">CAPE / Shiller PE Dampener</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Valuations within normal range ({capeValue.toFixed(1)}×) — no cap applied
              {asOfLabel && <span className="ml-1 opacity-60">as of {asOfLabel}</span>}
            </p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Toggle explainer"
          >
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
          </button>
          <span className="text-sm font-mono font-semibold text-signal-bullish">INACTIVE</span>
        </div>
        {explainer}
      </div>
    );
  }

  const delta = capeValue - 30;

  return (
    <div className="rounded-lg border-2 border-signal-neutral/50 bg-signal-neutral/10 p-4">
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-signal-neutral/20 shrink-0">
          <AlertTriangle className="h-6 w-6 text-signal-neutral" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-bold text-signal-neutral">CAPE DAMPENER ACTIVE</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-signal-neutral/20 text-signal-neutral border border-signal-neutral/30">
              {capeValue.toFixed(1)}× (+{delta.toFixed(1)}× above threshold)
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Shiller PE exceeds 30× — maximum capital deployment capped at <span className="text-signal-neutral font-semibold">75%</span> regardless of composite score.
            {asOfLabel && <span className="ml-1 opacity-60"> (as of {asOfLabel})</span>}
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-signal-neutral hover:text-foreground transition-colors p-1 shrink-0"
          aria-label="Toggle explainer"
        >
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </button>
        <div className="text-right shrink-0">
          <div className="text-2xl font-mono font-bold text-signal-neutral">75%</div>
          <div className="text-[10px] text-muted-foreground font-mono">MAX DEPLOY</div>
        </div>
      </div>
      {explainer}
    </div>
  );
}