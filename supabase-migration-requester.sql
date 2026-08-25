-- Supabase Migration: Add Requester feature
-- Run this in Supabase SQL Editor before deploying

-- 1. Create requesters table (admin-only add/delete)
CREATE TABLE IF NOT EXISTS public.requesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast name lookups
CREATE INDEX IF NOT EXISTS idx_requesters_name ON public.requesters(name);

-- Enable RLS
ALTER TABLE public.requesters ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can read, only admins can insert/delete
CREATE POLICY "Allow public read access on requesters" 
  ON public.requesters FOR SELECT 
  USING (true);

CREATE POLICY "Allow admin insert on requesters" 
  ON public.requesters FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE username = current_setting('request.jwt.claims', true)::json->>'sub' 
      AND role = 'admin'
    )
  );

CREATE POLICY "Allow admin delete on requesters" 
  ON public.requesters FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE username = current_setting('request.jwt.claims', true)::json->>'sub' 
      AND role = 'admin'
    )
  );

-- 2. Add requester column to quotations table
ALTER TABLE public.quotations 
  ADD COLUMN IF NOT EXISTS requester TEXT DEFAULT '';

-- 3. Insert some sample requesters (optional - remove if not needed)
INSERT INTO public.requesters (name) 
VALUES 
  ('Rahul Sharma'),
  ('Priya Gupta'),
  ('Amit Kumar')
ON CONFLICT (name) DO NOTHING;

-- Done! Now deploy your app.
