-- U10: notifica personale quando qualcun altro ti aggiunge o rimuove da una navetta
ALTER TABLE profiles ADD COLUMN notif_u10 BOOLEAN NOT NULL DEFAULT TRUE;
