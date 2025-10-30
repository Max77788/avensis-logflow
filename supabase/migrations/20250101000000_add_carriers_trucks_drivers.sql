-- Create carriers table
CREATE TABLE IF NOT EXISTS carriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trucks table
CREATE TABLE IF NOT EXISTS trucks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id text NOT NULL,
  carrier_id uuid NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(truck_id, carrier_id)
);

-- Create drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  carrier_id uuid NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(name, carrier_id)
);

-- Add columns to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS carrier_id uuid REFERENCES carriers(id) ON DELETE SET NULL;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trucks_carrier_id ON trucks(carrier_id);
CREATE INDEX IF NOT EXISTS idx_trucks_truck_id ON trucks(truck_id);
CREATE INDEX IF NOT EXISTS idx_drivers_carrier_id ON drivers(carrier_id);
CREATE INDEX IF NOT EXISTS idx_drivers_name ON drivers(name);
CREATE INDEX IF NOT EXISTS idx_tickets_carrier_id ON tickets(carrier_id);
CREATE INDEX IF NOT EXISTS idx_tickets_driver_id ON tickets(driver_id);

-- Enable Row Level Security
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for carriers
CREATE POLICY "Allow public read access to carriers"
  ON carriers FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public insert access to carriers" ON carriers;
CREATE POLICY "Allow public insert access to carriers"
  ON carriers FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to carriers" ON carriers;
CREATE POLICY "Allow public update access to carriers"
  ON carriers FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for trucks
CREATE POLICY "Allow public read access to trucks"
  ON trucks FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public insert access to trucks" ON trucks;
CREATE POLICY "Allow public insert access to trucks"
  ON trucks FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to trucks" ON trucks;
CREATE POLICY "Allow public update access to trucks"
  ON trucks FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for drivers
CREATE POLICY "Allow public read access to drivers"
  ON drivers FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public insert access to drivers" ON drivers;
CREATE POLICY "Allow public insert access to drivers"
  ON drivers FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to drivers" ON drivers;
CREATE POLICY "Allow public update access to drivers"
  ON drivers FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Insert sample data
INSERT INTO carriers (name) VALUES
  ('Express Logistics'),
  ('Premium Transport'),
  ('Standard Delivery')
ON CONFLICT (name) DO NOTHING;

INSERT INTO trucks (truck_id, carrier_id)
  SELECT 'T-001', id FROM carriers WHERE name = 'Express Logistics'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

INSERT INTO trucks (truck_id, carrier_id)
  SELECT 'T-002', id FROM carriers WHERE name = 'Express Logistics'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

INSERT INTO trucks (truck_id, carrier_id)
  SELECT 'T-003', id FROM carriers WHERE name = 'Express Logistics'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

INSERT INTO trucks (truck_id, carrier_id)
  SELECT 'T-004', id FROM carriers WHERE name = 'Premium Transport'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

INSERT INTO trucks (truck_id, carrier_id)
  SELECT 'T-005', id FROM carriers WHERE name = 'Premium Transport'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

INSERT INTO trucks (truck_id, carrier_id)
  SELECT 'T-006', id FROM carriers WHERE name = 'Premium Transport'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

INSERT INTO trucks (truck_id, carrier_id)
  SELECT 'T-007', id FROM carriers WHERE name = 'Standard Delivery'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

INSERT INTO trucks (truck_id, carrier_id)
  SELECT 'T-008', id FROM carriers WHERE name = 'Standard Delivery'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

INSERT INTO trucks (truck_id, carrier_id)
  SELECT 'T-009', id FROM carriers WHERE name = 'Standard Delivery'
ON CONFLICT (truck_id, carrier_id) DO NOTHING;

INSERT INTO drivers (name, carrier_id)
  SELECT 'Sarah Johnson', id FROM carriers WHERE name = 'Express Logistics'
ON CONFLICT (name, carrier_id) DO NOTHING;

INSERT INTO drivers (name, carrier_id)
  SELECT 'Mike Davis', id FROM carriers WHERE name = 'Express Logistics'
ON CONFLICT (name, carrier_id) DO NOTHING;

INSERT INTO drivers (name, carrier_id)
  SELECT 'Emma Wilson', id FROM carriers WHERE name = 'Express Logistics'
ON CONFLICT (name, carrier_id) DO NOTHING;

INSERT INTO drivers (name, carrier_id)
  SELECT 'Robert Brown', id FROM carriers WHERE name = 'Premium Transport'
ON CONFLICT (name, carrier_id) DO NOTHING;

INSERT INTO drivers (name, carrier_id)
  SELECT 'Lisa Anderson', id FROM carriers WHERE name = 'Premium Transport'
ON CONFLICT (name, carrier_id) DO NOTHING;

INSERT INTO drivers (name, carrier_id)
  SELECT 'James Taylor', id FROM carriers WHERE name = 'Premium Transport'
ON CONFLICT (name, carrier_id) DO NOTHING;

INSERT INTO drivers (name, carrier_id)
  SELECT 'Patricia Martinez', id FROM carriers WHERE name = 'Standard Delivery'
ON CONFLICT (name, carrier_id) DO NOTHING;

INSERT INTO drivers (name, carrier_id)
  SELECT 'David Garcia', id FROM carriers WHERE name = 'Standard Delivery'
ON CONFLICT (name, carrier_id) DO NOTHING;

INSERT INTO drivers (name, carrier_id)
  SELECT 'Jennifer Lee', id FROM carriers WHERE name = 'Standard Delivery'
ON CONFLICT (name, carrier_id) DO NOTHING;

