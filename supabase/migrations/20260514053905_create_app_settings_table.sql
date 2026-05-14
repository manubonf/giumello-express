-- Impostazioni globali dell'app (una sola riga)
CREATE TABLE app_settings (
  id                      INT         PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  min_interest_threshold  INT         NOT NULL DEFAULT 5,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserisce la riga di default (esiste sempre)
INSERT INTO app_settings (id, min_interest_threshold) VALUES (1, 5);

-- RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Tutti gli autenticati possono leggere le impostazioni
CREATE POLICY "Autenticati leggono impostazioni"
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);

-- Solo il backend (service_role) può modificare