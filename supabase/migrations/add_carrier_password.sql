-- Add password_hash column to carriers table
ALTER TABLE carriers
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN carriers.password_hash IS 'Bcrypt hashed password for carrier authentication';

-- Create index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_carriers_name ON carriers(name);

