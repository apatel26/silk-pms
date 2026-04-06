-- Update housekeeping_tasks status constraint to use 'dirty' instead of 'pending'
ALTER TABLE housekeeping_tasks DROP CONSTRAINT IF EXISTS housekeeping_tasks_status_check;
ALTER TABLE housekeeping_tasks ADD CONSTRAINT housekeeping_tasks_status_check CHECK (status IN ('dirty', 'cleaned', 'skip', 'occupied', 'out_of_order'));
