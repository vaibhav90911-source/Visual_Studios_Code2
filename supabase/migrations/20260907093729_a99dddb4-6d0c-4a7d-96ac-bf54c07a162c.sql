ALTER TABLE public.recordings
  ADD COLUMN review text NOT NULL DEFAULT '',
  ADD COLUMN screenshot_path text;

CREATE POLICY "Anyone can view recording proofs"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'recording-proofs');

CREATE POLICY "Anyone can upload recording proofs"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'recording-proofs');

CREATE POLICY "Anyone can replace recording proofs"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'recording-proofs')
WITH CHECK (bucket_id = 'recording-proofs');

CREATE POLICY "Anyone can remove recording proofs"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'recording-proofs');