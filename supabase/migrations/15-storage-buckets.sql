-- Storage buckets for user/staff photos and exercise media
CREATE OR REPLACE FUNCTION create_bucket_if_not_exists(bucket_id TEXT, bucket_name TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (bucket_id, bucket_name, true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

SELECT create_bucket_if_not_exists('user-photos', 'user-photos');
SELECT create_bucket_if_not_exists('staff-photos', 'staff-photos');
SELECT create_bucket_if_not_exists('exercise-media', 'exercise-media');

DROP FUNCTION create_bucket_if_not_exists;

-- RLS: allow authenticated users to read from all buckets
CREATE POLICY "Anyone can read user photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-photos');

CREATE POLICY "Anyone can read staff photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'staff-photos');

CREATE POLICY "Anyone can read exercise media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'exercise-media');

-- RLS: authenticated users can upload to any bucket
CREATE POLICY "Authenticated users can upload user photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'user-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload staff photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'staff-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload exercise media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'exercise-media' AND auth.role() = 'authenticated');

-- RLS: users can update/delete their own uploads
CREATE POLICY "Users can update own uploads"
  ON storage.objects FOR UPDATE
  USING (auth.uid() = owner)
  WITH CHECK (auth.uid() = owner);

CREATE POLICY "Users can delete own uploads"
  ON storage.objects FOR DELETE
  USING (auth.uid() = owner);
