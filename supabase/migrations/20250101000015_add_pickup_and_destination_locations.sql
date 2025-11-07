-- Create pickup_locations table if it doesn't exist
CREATE TABLE IF NOT EXISTS pickup_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create destination_sites table if it doesn't exist (or update if exists)
CREATE TABLE IF NOT EXISTS destination_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  location text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for pickup_locations
ALTER TABLE pickup_locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pickup_locations
DROP POLICY IF EXISTS "Allow public read access to pickup_locations" ON pickup_locations;
CREATE POLICY "Allow public read access to pickup_locations"
  ON pickup_locations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public insert access to pickup_locations" ON pickup_locations;
CREATE POLICY "Allow public insert access to pickup_locations"
  ON pickup_locations FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to pickup_locations" ON pickup_locations;
CREATE POLICY "Allow public update access to pickup_locations"
  ON pickup_locations FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Enable RLS for destination_sites
ALTER TABLE destination_sites ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for destination_sites
DROP POLICY IF EXISTS "Allow public read access to destination_sites" ON destination_sites;
CREATE POLICY "Allow public read access to destination_sites"
  ON destination_sites FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public insert access to destination_sites" ON destination_sites;
CREATE POLICY "Allow public insert access to destination_sites"
  ON destination_sites FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to destination_sites" ON destination_sites;
CREATE POLICY "Allow public update access to destination_sites"
  ON destination_sites FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Insert pickup locations
INSERT INTO pickup_locations (name) VALUES
  ('Enzo'),
  ('Funston Solar'),
  ('Jones City'),
  ('Tiger Solar'),
  ('Impact Site'),
  ('Return Mountain'),
  ('Sea Bank'),
  ('Double EE')
ON CONFLICT (name) DO NOTHING;

-- Insert destination sites
INSERT INTO destination_sites (name) VALUES
  ('Tindol'),
  ('McCarthy Log'),
  ('Kiewit'),
  ('Impact Site'),
  ('McCarthy'),
  ('Return Mountain'),
  ('Sea Bank'),
  ('Double EE')
ON CONFLICT (name) DO NOTHING;

