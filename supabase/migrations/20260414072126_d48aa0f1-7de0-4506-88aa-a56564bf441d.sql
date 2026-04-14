
-- Create edgar_cache table for daily EDGAR scraper results
CREATE TABLE public.edgar_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  data jsonb NOT NULL,
  scraped_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.edgar_cache ENABLE ROW LEVEL SECURITY;

-- Public read access (same pattern as macro_snapshots)
CREATE POLICY "Anyone can view edgar cache"
  ON public.edgar_cache
  FOR SELECT
  TO public
  USING (true);
