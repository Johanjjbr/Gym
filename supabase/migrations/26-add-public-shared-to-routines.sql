ALTER TABLE routine_templates
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by_user UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS shared_publicly BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_routine_templates_is_public ON routine_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_routine_templates_shared_publicly ON routine_templates(shared_publicly);
CREATE INDEX IF NOT EXISTS idx_routine_templates_created_by_user ON routine_templates(created_by_user);
