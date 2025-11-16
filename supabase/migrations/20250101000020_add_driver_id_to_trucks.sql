-- Add driver_id column to trucks table
-- This column tracks which driver is assigned to each truck
-- When a driver picks a truck during signup, this field gets populated
-- When a driver releases a truck, this field gets cleared

ALTER TABLE trucks ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_trucks_driver_id ON trucks(driver_id);

-- Add comment for clarity
COMMENT ON COLUMN trucks.driver_id IS 'The driver currently assigned to this truck. NULL if no driver is assigned.';

