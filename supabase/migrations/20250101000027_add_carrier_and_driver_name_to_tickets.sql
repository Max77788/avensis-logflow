-- ============================================================================
-- ADD CARRIER AND DRIVER_NAME COLUMNS TO TICKETS TABLE
-- ============================================================================
-- This migration adds the carrier (text) and driver_name (text) columns
-- to the tickets table to support the current application logic.
--
-- These columns store denormalized data for easier querying:
-- - carrier: The carrier name (text) - denormalized from carriers table
-- - driver_name: The driver name (text) - denormalized from drivers table
--
-- The tickets table also has carrier_id and driver_id (UUIDs) which are
-- foreign keys to the carriers and drivers tables respectively.
-- ============================================================================

-- Add carrier column if it doesn't exist
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS carrier text;

-- Add driver_name column if it doesn't exist
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS driver_name text;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tickets_carrier ON tickets(carrier);
CREATE INDEX IF NOT EXISTS idx_tickets_driver_name ON tickets(driver_name);

-- Add comment to force schema cache refresh
COMMENT ON TABLE tickets IS 'Tickets table with carrier and driver_name columns for denormalized data';

