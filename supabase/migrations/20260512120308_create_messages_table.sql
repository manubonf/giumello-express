-- Migration: create_messages_table
-- Descrizione: tabella principale dei messaggi

CREATE TABLE messages (
  id          UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
  text        TEXT      NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Abilita Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: lettura pubblica (anonima)
CREATE POLICY "Allow public read"
  ON messages FOR SELECT
  USING (true);
