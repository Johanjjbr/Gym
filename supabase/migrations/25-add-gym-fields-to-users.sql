ALTER TABLE users
  ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES gyms(id),
  ADD COLUMN IF NOT EXISTS is_free_user BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_share_routines BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_gym_id ON users(gym_id);

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON users FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());
