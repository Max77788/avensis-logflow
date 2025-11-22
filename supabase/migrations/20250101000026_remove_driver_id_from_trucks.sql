-- ============================================================================
-- REMOVE DRIVER_ID FROM TRUCKS TABLE
-- ============================================================================
-- This migration removes the driver_id column from the trucks table.
--
-- REASON FOR CHANGE:
-- The relationship between drivers and trucks has been reversed.
--
-- OLD STRUCTURE:
--   trucks.driver_id → drivers.id (truck points to driver)
--   Problem: Difficult to find available trucks, complex queries
--
-- NEW STRUCTURE:
--   drivers.default_truck_id → trucks.id (driver points to truck)
--   Benefits: Easier to find available trucks, simpler queries, better data model
--
-- TRUCK STATUS MANAGEMENT:
--   - Truck status is now managed based on driver status
--   - When driver is active → truck is active
--   - When driver is inactive → truck is inactive
--   - When driver changes trucks → old truck becomes inactive (available)
-- ============================================================================

-- Drop the index first
DROP INDEX IF EXISTS idx_trucks_driver_id;

-- Remove the foreign key constraint and column
ALTER TABLE trucks DROP COLUMN IF EXISTS driver_id;

-- Add comment for clarity
COMMENT ON TABLE trucks IS 'Trucks table. Relationship with drivers is now via drivers.default_truck_id instead of trucks.driver_id';

