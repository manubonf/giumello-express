-- Aggiunge colonna author alla tabella messages
ALTER TABLE messages
  ADD COLUMN author TEXT NOT NULL DEFAULT 'anonymous';