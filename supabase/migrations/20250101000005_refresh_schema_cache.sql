-- Refresh schema cache by adding a comment to the tickets table
-- This forces Supabase to refresh its schema cache
COMMENT ON TABLE tickets IS 'Tickets table with image support';

-- Ensure ticket_image_url column exists
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_image_url text;

-- Add carrier_id and driver_id if they don't exist
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS carrier_id uuid REFERENCES carriers(id) ON DELETE SET NULL;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_tickets_carrier_id ON tickets(carrier_id);
CREATE INDEX IF NOT EXISTS idx_tickets_driver_id ON tickets(driver_id);

