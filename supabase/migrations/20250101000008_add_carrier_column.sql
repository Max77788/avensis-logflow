-- Add carrier column to tickets table if it doesn't exist
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS carrier text;

-- Create an index on carrier for better query performance
CREATE INDEX IF NOT EXISTS idx_tickets_carrier ON tickets(carrier);

