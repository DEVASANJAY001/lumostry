
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-photos', 'chat-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload chat photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-photos');

CREATE POLICY "Anyone can view chat photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-photos');
