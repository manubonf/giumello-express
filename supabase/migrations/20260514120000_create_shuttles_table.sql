-- Tabella navette
CREATE TABLE shuttles (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  status          TEXT        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft', 'confirmed', 'full', 'done', 'cancelled')),
  departure_time  TIMESTAMPTZ NOT NULL,
  max_seats       INT         NOT NULL CHECK (max_seats > 0),
  available_seats INT         NOT NULL,
  min_seats       INT         NOT NULL,
  created_by      UUID        NOT NULL REFERENCES auth.users(id),
  proposal_id     UUID        NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT available_seats_bounds CHECK (available_seats >= 0 AND available_seats <= max_seats)
);

-- Trigger per updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shuttles_updated_at
  BEFORE UPDATE ON shuttles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE shuttles ENABLE ROW LEVEL SECURITY;

-- Utenti autenticati vedono tutte le navette tranne le cancellate
-- Il master vede anche le cancellate
CREATE POLICY "Utenti vedono navette"
  ON shuttles FOR SELECT
  TO authenticated
  USING (
    status != 'cancelled'
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'master'
    )
  );

-- Funzione atomica per prenotare posti (usata in Fase 3)
CREATE OR REPLACE FUNCTION book_seats(p_shuttle_id UUID, p_count INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_available INT;
  v_min_seats INT;
  v_max_seats INT;
  v_status    TEXT;
BEGIN
  SELECT available_seats, min_seats, max_seats, status
  INTO v_available, v_min_seats, v_max_seats, v_status
  FROM shuttles
  WHERE id = p_shuttle_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Navetta non trovata';
  END IF;

  IF v_status NOT IN ('draft', 'confirmed') THEN
    RAISE EXCEPTION 'Navetta non prenotabile: %', v_status;
  END IF;

  IF v_available < p_count THEN
    RAISE EXCEPTION 'Posti insufficienti: disponibili %, richiesti %', v_available, p_count;
  END IF;

  UPDATE shuttles
  SET
    available_seats = v_available - p_count,
    status = CASE
      WHEN v_available - p_count = 0 THEN 'full'
      WHEN v_status = 'draft' AND (v_max_seats - (v_available - p_count)) >= v_min_seats THEN 'confirmed'
      ELSE v_status
    END
  WHERE id = p_shuttle_id;
END;
$$;

-- Funzione atomica per liberare posti (usata in Fase 3)
CREATE OR REPLACE FUNCTION release_seats(p_shuttle_id UUID, p_count INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE shuttles
  SET
    available_seats = LEAST(available_seats + p_count, max_seats),
    status = CASE
      WHEN status = 'full' THEN 'confirmed'
      ELSE status
    END
  WHERE id = p_shuttle_id;
END;
$$;
