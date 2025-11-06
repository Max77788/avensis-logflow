-- Create destination_sites table
CREATE TABLE IF NOT EXISTS destination_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  location text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_destination_sites_name ON destination_sites(name);

-- Enable Row Level Security
ALTER TABLE destination_sites ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for destination_sites
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

DROP POLICY IF EXISTS "Allow public delete access to destination_sites" ON destination_sites;
CREATE POLICY "Allow public delete access to destination_sites"
  ON destination_sites FOR DELETE
  USING (true);

-- Insert sample destination sites
INSERT INTO destination_sites (name, location, description) VALUES
  ('Quarry A - North', 'North Site', 'Primary quarry location in the north'),
  ('Quarry B - South', 'South Site', 'Secondary quarry location in the south'),
  ('Quarry C - East', 'East Site', 'Tertiary quarry location in the east'),
  ('Processing Plant', 'Central', 'Main processing facility'),
  ('Distribution Center', 'West', 'Regional distribution hub')
ON CONFLICT (name) DO NOTHING;

