-- ============================================================================
-- REBUILD DATABASE SCHEMA FROM SCRATCH
-- ============================================================================
-- This migration rebuilds the entire database schema based on the requirements:
-- 1. Each truck has a unique UUID and a display name (truck_id)
-- 2. One truck belongs to one carrier
-- 3. One truck can have one driver assigned
-- 4. Driver searches for carrier, then picks one of its trucks
-- 5. Truck status is derived from assigned driver's status
-- 6. If no driver assigned, truck status is 'inactive'
-- ============================================================================

-- Drop existing tables and functions (if they exist)
DROP TRIGGER IF EXISTS trigger_update_truck_status_on_driver_change ON drivers;
DROP TRIGGER IF EXISTS trigger_update_truck_status_on_driver_insert ON drivers;
DROP TRIGGER IF EXISTS trigger_update_truck_status_on_driver_delete ON drivers;
DROP FUNCTION IF EXISTS update_truck_status();

-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS trucks CASCADE;
DROP TABLE IF EXISTS carriers CASCADE;

-- ============================================================================
-- CREATE CARRIERS TABLE
-- ============================================================================
CREATE TABLE carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_carriers_name ON carriers(name);

-- ============================================================================
-- CREATE TRUCKS TABLE
-- ============================================================================
CREATE TABLE trucks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id text NOT NULL,
  carrier_id uuid NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'inactive',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(truck_id, carrier_id)
);

CREATE INDEX idx_trucks_carrier_id ON trucks(carrier_id);
CREATE INDEX idx_trucks_truck_id ON trucks(truck_id);
CREATE INDEX idx_trucks_status ON trucks(status);

-- ============================================================================
-- CREATE DRIVERS TABLE
-- ============================================================================
CREATE TABLE drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  carrier_id uuid NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE,
  default_truck_id uuid REFERENCES trucks(id) ON DELETE SET NULL,
  driver_qr_code VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'inactive',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(name, carrier_id)
);

CREATE INDEX idx_drivers_carrier_id ON drivers(carrier_id);
CREATE INDEX idx_drivers_name ON drivers(name);
CREATE INDEX idx_drivers_email ON drivers(email);
CREATE INDEX idx_drivers_qr_code ON drivers(driver_qr_code);
CREATE INDEX idx_drivers_default_truck_id ON drivers(default_truck_id);

-- ============================================================================
-- CREATE TICKETS TABLE
-- ============================================================================
CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id text NOT NULL UNIQUE,
  truck_id uuid NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
  carrier_id uuid NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  product text,
  origin_site text,
  destination_site text,
  net_weight numeric,
  scale_operator_signature text,
  ticket_image_url text,
  status text DEFAULT 'CREATED',
  created_at timestamptz DEFAULT now(),
  verified_at_scale timestamptz,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_tickets_truck_id ON tickets(truck_id);
CREATE INDEX idx_tickets_carrier_id ON tickets(carrier_id);
CREATE INDEX idx_tickets_driver_id ON tickets(driver_id);
CREATE INDEX idx_tickets_status ON tickets(status);

-- ============================================================================
-- CREATE FUNCTION TO UPDATE TRUCK STATUS
-- ============================================================================
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

-- ============================================================================
-- CREATE TRIGGERS FOR AUTOMATIC STATUS UPDATES
-- ============================================================================
CREATE TRIGGER trigger_update_truck_status_on_driver_change
AFTER UPDATE OF status, default_truck_id ON drivers
FOR EACH ROW
EXECUTE FUNCTION update_truck_status();

CREATE TRIGGER trigger_update_truck_status_on_driver_insert
AFTER INSERT ON drivers
FOR EACH ROW
EXECUTE FUNCTION update_truck_status();

CREATE TRIGGER trigger_update_truck_status_on_driver_delete
AFTER DELETE ON drivers
FOR EACH ROW
EXECUTE FUNCTION update_truck_status();

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES - ALLOW PUBLIC ACCESS
-- ============================================================================
CREATE POLICY "Allow public read access to carriers"
  ON carriers FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to carriers"
  ON carriers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to carriers"
  ON carriers FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access to trucks"
  ON trucks FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to trucks"
  ON trucks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to trucks"
  ON trucks FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access to drivers"
  ON drivers FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to drivers"
  ON drivers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to drivers"
  ON drivers FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access to tickets"
  ON tickets FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to tickets"
  ON tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to tickets"
  ON tickets FOR UPDATE USING (true) WITH CHECK (true);

