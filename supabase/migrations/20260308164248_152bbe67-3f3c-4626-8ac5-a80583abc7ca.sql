
-- Reports table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('harassment', 'fake_profile', 'spam', 'inappropriate_content', 'underage', 'scam', 'other')),
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reporter_id, reported_id)
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports" ON public.reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can see their own reports" ON public.reports
  FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

-- Add date_of_birth to profiles
ALTER TABLE public.profiles ADD COLUMN date_of_birth DATE;
