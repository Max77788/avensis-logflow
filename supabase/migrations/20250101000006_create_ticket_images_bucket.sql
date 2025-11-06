-- Create ticket-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-images', 'ticket-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read files
CREATE POLICY "Allow public read access to ticket-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-images');

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload ticket images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ticket-images' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated users to delete ticket images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ticket-images'
  AND auth.role() = 'authenticated'
);

