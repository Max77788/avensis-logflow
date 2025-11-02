-- Add driver authentication fields to drivers table
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS default_truck_id VARCHAR(255);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS driver_qr_code VARCHAR(255);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'inactive';

-- Update existing drivers with unique values
UPDATE drivers SET
  email = COALESCE(email, CONCAT('driver_', id::text, '@avensis.local')),
  driver_qr_code = COALESCE(driver_qr_code, CONCAT('DRIVER-', EXTRACT(EPOCH FROM NOW())::bigint, '-', SUBSTRING(MD5(RANDOM()::text), 1, 9)))
WHERE email IS NULL OR email = '' OR driver_qr_code IS NULL OR driver_qr_code = '';

-- Add unique constraints after data is populated
ALTER TABLE drivers ADD CONSTRAINT drivers_email_key UNIQUE (email);
ALTER TABLE drivers ADD CONSTRAINT drivers_driver_qr_code_key UNIQUE (driver_qr_code);

-- Add driver_id to tickets table for linking tickets to drivers
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS driver_id UUID;

-- Create index on driver email for faster lookups
CREATE INDEX IF NOT EXISTS idx_drivers_email ON drivers(email);

-- Create index on driver QR code for faster lookups
CREATE INDEX IF NOT EXISTS idx_drivers_qr_code ON drivers(driver_qr_code);

-- Create index on tickets driver_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_tickets_driver_id ON tickets(driver_id);

-- Add foreign key constraint from tickets to drivers (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_tickets_driver_id'
  ) THEN
    ALTER TABLE tickets ADD CONSTRAINT fk_tickets_driver_id
      FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL;
  END IF;
END $$;

