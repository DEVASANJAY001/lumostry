
-- Add photos gallery array and verification fields to profiles
ALTER TABLE public.profiles ADD COLUMN photos TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN verification_photo_url TEXT;

-- Create photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);

CREATE POLICY "Photo images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "Users can upload their own photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own photos" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own photos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
