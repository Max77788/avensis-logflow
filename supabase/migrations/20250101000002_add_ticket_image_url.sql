-- Add ticket_image_url column to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_image_url text;

-- Create storage bucket for ticket images if it doesn't exist
-- Note: This is typically done through Supabase dashboard, but we can document it here
-- To create the bucket manually:
-- 1. Go to Supabase dashboard
-- 2. Navigate to Storage
-- 3. Create a new bucket named "ticket-images"
-- 4. Set it to public (allow public access)
-- 5. Add RLS policy to allow authenticated users to upload and read

