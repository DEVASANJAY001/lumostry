
-- Fix overly permissive INSERT policy - notifications should only be inserted by triggers (SECURITY DEFINER)
DROP POLICY "Users can insert notifications" ON public.notifications;
-- No direct INSERT policy needed since triggers use SECURITY DEFINER
