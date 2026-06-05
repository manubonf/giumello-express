-- Storico cancellazioni prenotazioni (snapshot al momento dell'eliminazione)
CREATE TABLE booking_cancellations (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shuttle_id         UUID        NOT NULL,
  booker_id          UUID        NOT NULL,
  booker_username    TEXT        NOT NULL,
  participant_labels TEXT[]      NOT NULL DEFAULT '{}',
  booked_at          TIMESTAMPTZ NOT NULL,
  cancelled_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE booking_cancellations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo master vede le cancellazioni"
  ON booking_cancellations FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'master')
  );

-- Trigger function: cattura i dati prima che la riga bookings venga eliminata.
-- Gira come BEFORE DELETE così booking_participants è ancora presente (CASCADE non è ancora scattato).
CREATE OR REPLACE FUNCTION log_booking_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_username TEXT;
  v_labels   TEXT[];
BEGIN
  SELECT username INTO v_username
  FROM profiles
  WHERE id = OLD.booker_id;

  SELECT COALESCE(
    ARRAY_AGG(
      CASE
        WHEN bp.is_guest THEN COALESCE(bp.guest_label, 'Ospite') || ' (ospite)'
        ELSE COALESCE((SELECT p.username FROM profiles p WHERE p.id = bp.user_id), '—')
      END
      ORDER BY bp.created_at ASC
    ),
    '{}'
  ) INTO v_labels
  FROM booking_participants bp
  WHERE bp.booking_id = OLD.id;

  INSERT INTO booking_cancellations
    (shuttle_id, booker_id, booker_username, participant_labels, booked_at)
  VALUES
    (OLD.shuttle_id, OLD.booker_id, COALESCE(v_username, '—'), v_labels, OLD.created_at);

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_booking_cancellation
BEFORE DELETE ON bookings
FOR EACH ROW EXECUTE FUNCTION log_booking_cancellation();
