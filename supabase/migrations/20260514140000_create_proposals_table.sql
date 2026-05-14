-- Proposte di navetta dagli utenti base
CREATE TABLE proposals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  proposer_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  departure_time  TIMESTAMPTZ NOT NULL,
  notes           TEXT        NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Tutti gli autenticati leggono tutte le proposte
CREATE POLICY "Autenticati leggono proposte"
  ON proposals FOR SELECT TO authenticated
  USING (true);

-- Ogni utente può inserire solo le proprie proposte
CREATE POLICY "Utenti inseriscono proprie proposte"
  ON proposals FOR INSERT TO authenticated
  WITH CHECK (proposer_id = auth.uid());
