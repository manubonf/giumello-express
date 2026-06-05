-- La FK booking_participants.user_id → profiles.id era ON DELETE SET NULL,
-- ma il CHECK CONSTRAINT participant_xor impone user_id IS NOT NULL per i
-- partecipanti registrati (is_guest = false). Le due definizioni sono
-- incompatibili: il SET NULL violerebbe sempre il check.
-- Si cambia in ON DELETE CASCADE: quando un profilo viene eliminato,
-- le righe di partecipazione vengono rimosse insieme ad esso.
ALTER TABLE booking_participants
  DROP CONSTRAINT booking_participants_user_id_fkey;

ALTER TABLE booking_participants
  ADD CONSTRAINT booking_participants_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
