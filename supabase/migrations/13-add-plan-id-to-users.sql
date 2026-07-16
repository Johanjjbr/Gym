-- Add plan_id FK to users
ALTER TABLE users ADD COLUMN plan_id UUID REFERENCES plans(id);

-- Migrate existing plan text values to plan_id
UPDATE users u
SET plan_id = p.id
FROM plans p
WHERE (u.plan = p.name OR u.plan = 'Plan ' || p.name)
  AND u.plan_id IS NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_users_plan_id ON users(plan_id);
