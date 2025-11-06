-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to ticket-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload ticket images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete ticket images" ON storage.objects;

-- Create new policies with proper setup
-- Allow public read access
CREATE POLICY "Allow public read ticket-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-images');

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated upload ticket-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ticket-images');

-- Allow authenticated users to update
CREATE POLICY "Allow authenticated update ticket-images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ticket-images')
WITH CHECK (bucket_id = 'ticket-images');

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated delete ticket-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'ticket-images');

