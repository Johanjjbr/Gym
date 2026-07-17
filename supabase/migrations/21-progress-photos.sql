CREATE TABLE IF NOT EXISTS progress_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_photos_user_id ON progress_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_photos_date ON progress_photos(date DESC);

ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver sus propias fotos"
  ON progress_photos FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Usuarios pueden insertar sus propias fotos"
  ON progress_photos FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Usuarios pueden eliminar sus propias fotos"
  ON progress_photos FOR DELETE
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));
