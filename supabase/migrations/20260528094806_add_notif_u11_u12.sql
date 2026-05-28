-- U11: orario navetta modificato — tutte le navette
-- U12: orario navetta modificato — solo navette prenotate
ALTER TABLE profiles ADD COLUMN notif_u11 BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN notif_u12 BOOLEAN NOT NULL DEFAULT TRUE;
