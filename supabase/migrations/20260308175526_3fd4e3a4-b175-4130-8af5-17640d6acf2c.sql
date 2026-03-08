
CREATE TABLE public.profile_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  points_spent integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own boosts" ON public.profile_boosts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own boosts" ON public.profile_boosts FOR INSERT WITH CHECK (auth.uid() = user_id);
