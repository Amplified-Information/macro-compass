
-- Table for historical macro data snapshots
CREATE TABLE public.macro_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_data JSONB NOT NULL,
  composite_score NUMERIC(5,4),
  regime TEXT,
  signals JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for time-based queries
CREATE INDEX idx_macro_snapshots_created_at ON public.macro_snapshots (created_at DESC);

-- Enable RLS
ALTER TABLE public.macro_snapshots ENABLE ROW LEVEL SECURITY;

-- Public read access (dashboard is public)
CREATE POLICY "Anyone can view macro snapshots"
  ON public.macro_snapshots
  FOR SELECT
  USING (true);
