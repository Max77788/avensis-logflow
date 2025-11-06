-- Migrate old ticket statuses to new status values
-- Old flow: CREATED -> VERIFIED_AT_SCALE -> IN_TRANSIT -> DELIVERED
-- New flow: CREATED -> VERIFIED -> DELIVERED -> CLOSED

-- Update VERIFIED_AT_SCALE to VERIFIED
UPDATE tickets SET status = 'VERIFIED' WHERE status = 'VERIFIED_AT_SCALE';

-- Update IN_TRANSIT to DELIVERED
UPDATE tickets SET status = 'DELIVERED' WHERE status = 'IN_TRANSIT';

-- Ensure all tickets have valid status values
-- Any other invalid statuses will be set to CREATED as a safe default
UPDATE tickets SET status = 'CREATED' 
WHERE status NOT IN ('CREATED', 'VERIFIED', 'DELIVERED', 'CLOSED');

