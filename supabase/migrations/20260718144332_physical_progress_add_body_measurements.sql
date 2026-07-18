ALTER TABLE physical_progress
ADD COLUMN body_measurements JSONB DEFAULT '{}'::jsonb;
