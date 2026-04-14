import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, BellRing, Mail, Globe, CheckCircle } from "lucide-react";

export function AlertSubscription() {
  const [email, setEmail] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [regimeAlerts, setRegimeAlerts] = useState(true);
  const [signalAlerts, setSignalAlerts] = useState(true);
  const [showWebhook, setShowWebhook] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const { error } = await supabase.from("alert_subscribers").insert({
        email: email.trim().toLowerCase(),
        webhook_url: webhookUrl.trim() || null,
        alert_regime_change: regimeAlerts,
        alert_signal_flips: signalAlerts,
      });

      if (error) {
        if (error.code === "23505") {
          setErrorMsg("This email is already subscribed.");
          setStatus("error");
        } else {
          throw error;
        }
        return;
      }

      setStatus("success");
      setEmail("");
      setWebhookUrl("");
    } catch (err) {
      setErrorMsg("Failed to subscribe. Please try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="border border-signal-bullish/30 bg-signal-bullish/5 rounded-xl p-4">
        <div className="flex items-center gap-2 text-signal-bullish">
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Subscribed successfully!</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          You'll receive alerts when the macro regime changes or key signals flip.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl bg-card">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BellRing className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Alert Subscriptions</h3>
            <p className="text-xs text-muted-foreground">Get notified on regime changes & signal flips</p>
          </div>
        </div>
        <Bell className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-12" : ""}`} />
      </button>

      {isExpanded && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {/* Email */}
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
              <Mail className="h-3 w-3" /> Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Webhook toggle */}
          <button
            type="button"
            onClick={() => setShowWebhook(!showWebhook)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <Globe className="h-3 w-3" />
            {showWebhook ? "Hide webhook" : "Add webhook URL (optional)"}
          </button>

          {showWebhook && (
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-webhook.example.com/alerts"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          )}

          {/* Alert type preferences */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={regimeAlerts}
                onChange={(e) => setRegimeAlerts(e.target.checked)}
                className="rounded border-border"
              />
              Regime changes
            </label>
            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={signalAlerts}
                onChange={(e) => setSignalAlerts(e.target.checked)}
                className="rounded border-border"
              />
              Signal flips
            </label>
          </div>

          {errorMsg && (
            <p className="text-xs text-signal-bearish">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={status === "loading" || !email.trim()}
            className="w-full py-2 px-4 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {status === "loading" ? "Subscribing…" : "Subscribe to Alerts"}
          </button>

          <p className="text-[11px] text-muted-foreground text-center">
            Alerts check daily at 6:30 AM UTC after the data refresh.
          </p>
        </form>
      )}
    </div>
  );
}
