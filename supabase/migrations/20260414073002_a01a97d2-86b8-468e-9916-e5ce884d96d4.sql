
-- Alert subscribers table
CREATE TABLE public.alert_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  webhook_url TEXT,
  alert_regime_change BOOLEAN NOT NULL DEFAULT true,
  alert_signal_flips BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_subscriber_email UNIQUE (email)
);

-- Alert history table
CREATE TABLE public.alert_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL, -- 'regime_change', 'signal_flip', 'threshold_cross'
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  subscribers_notified INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alert_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

-- RLS: anyone can insert (signup), but only service role manages the rest
CREATE POLICY "Anyone can subscribe" ON public.alert_subscribers
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can view alert history" ON public.alert_history
  FOR SELECT TO public USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_alert_subscribers_updated_at
  BEFORE UPDATE ON public.alert_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
