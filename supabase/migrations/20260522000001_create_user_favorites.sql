CREATE TABLE user_favorites (
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  favorite_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, favorite_profile_id),
  CHECK (user_id != favorite_profile_id)
);

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own favorites"
  ON user_favorites FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
