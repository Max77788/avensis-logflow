-- Add status column to trucks table
-- Status is derived from the assigned driver's status
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'inactive';

-- Create a function to update truck status based on assigned driver
CREATE OR REPLACE FUNCTION update_truck_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update truck status based on assigned driver's status
  UPDATE trucks
  SET status = COALESCE(
    (SELECT drivers.status 
     FROM drivers 
     WHERE drivers.default_truck_id = trucks.id 
     LIMIT 1),
    'inactive'
  )
  WHERE trucks.id = NEW.id OR trucks.id = OLD.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update truck status when driver status changes
DROP TRIGGER IF EXISTS trigger_update_truck_status_on_driver_change ON drivers;
CREATE TRIGGER trigger_update_truck_status_on_driver_change
AFTER UPDATE OF status, default_truck_id ON drivers
FOR EACH ROW
EXECUTE FUNCTION update_truck_status();

-- Create trigger to update truck status when driver is inserted
DROP TRIGGER IF EXISTS trigger_update_truck_status_on_driver_insert ON drivers;
CREATE TRIGGER trigger_update_truck_status_on_driver_insert
AFTER INSERT ON drivers
FOR EACH ROW
EXECUTE FUNCTION update_truck_status();

-- Create trigger to update truck status when driver is deleted
DROP TRIGGER IF EXISTS trigger_update_truck_status_on_driver_delete ON drivers;
CREATE TRIGGER trigger_update_truck_status_on_driver_delete
AFTER DELETE ON drivers
FOR EACH ROW
EXECUTE FUNCTION update_truck_status();

-- Initialize truck statuses based on current driver assignments
UPDATE trucks
SET status = COALESCE(
  (SELECT drivers.status 
   FROM drivers 
   WHERE drivers.default_truck_id = trucks.id 
   LIMIT 1),
  'inactive'
);

-- Create index on trucks status for faster lookups
CREATE INDEX IF NOT EXISTS idx_trucks_status ON trucks(status);

