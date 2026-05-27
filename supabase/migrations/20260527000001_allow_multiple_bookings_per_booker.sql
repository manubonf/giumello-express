-- Rimuove il vincolo UNIQUE(shuttle_id, booker_id) su bookings.
-- Con il nuovo modello a 3 modalità (prenota per sé, per un utente, per un ospite),
-- ogni azione crea una prenotazione separata e un utente può essere booker di
-- più prenotazioni sulla stessa navetta.
-- L'unicità è ora garantita a livello applicativo sui partecipanti:
-- un profilo registrato non può comparire come participant più di una volta per navetta.
ALTER TABLE bookings DROP CONSTRAINT bookings_shuttle_id_booker_id_key;
