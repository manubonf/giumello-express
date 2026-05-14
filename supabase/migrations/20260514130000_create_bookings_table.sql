-- Prenotazioni: una per utente per navetta
CREATE TABLE bookings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shuttle_id  UUID        NOT NULL REFERENCES shuttles(id) ON DELETE CASCADE,
  booker_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shuttle_id, booker_id)
);

-- Partecipanti di una prenotazione (ogni riga = un posto occupato)
CREATE TABLE booking_participants (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  -- FK su profiles (stessa UUID di auth.users) per consentire join PostgREST
  user_id     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  guest_label TEXT        NULL,
  is_guest    BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT participant_xor CHECK (
    (is_guest = false AND user_id IS NOT NULL AND guest_label IS NULL) OR
    (is_guest = true  AND user_id IS NULL     AND guest_label IS NOT NULL)
  )
);

-- RLS bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utenti vedono proprie prenotazioni"
  ON bookings FOR SELECT TO authenticated
  USING (
    booker_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'master')
  );

-- RLS booking_participants
ALTER TABLE booking_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partecipanti visibili al booker e al master"
  ON booking_participants FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_id AND bookings.booker_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'master')
  );
