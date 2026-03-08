
-- Profile visitors table
CREATE TABLE public.profile_visitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_user_id UUID NOT NULL,
  visitor_user_id UUID NOT NULL,
  visited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_user_id, visitor_user_id)
);

ALTER TABLE public.profile_visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own visitors"
  ON public.profile_visitors FOR SELECT
  USING (auth.uid() = profile_user_id);

CREATE POLICY "Users can insert visits"
  ON public.profile_visitors FOR INSERT
  WITH CHECK (auth.uid() = visitor_user_id);

CREATE POLICY "Users can update visits"
  ON public.profile_visitors FOR UPDATE
  USING (auth.uid() = visitor_user_id);

-- Stories table
CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  media_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-expired stories"
  ON public.stories FOR SELECT
  USING (expires_at > now());

CREATE POLICY "Users can insert own stories"
  ON public.stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories"
  ON public.stories FOR DELETE
  USING (auth.uid() = user_id);
