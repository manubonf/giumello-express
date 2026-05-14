-- =============================================================
-- SEED LOCALE — eseguito dopo ogni `supabase db reset`
-- Questi dati esistono SOLO nell'ambiente locale di sviluppo
-- =============================================================

-- Impostazioni app: soglia minima di interesse per le proposte
-- (la riga esiste già grazie alla migration, questo la aggiorna
--  nel caso il reset l'abbia riportata al default)
UPDATE app_settings
SET min_interest_threshold = 3  -- più basso in locale per testare facilmente
WHERE id = 1;

-- =============================================================
-- NOTA: l'utente master NON viene creato qui.
-- auth.users è gestito da Supabase Auth e non è modificabile
-- via seed SQL in modo affidabile.
-- Per creare il master in locale, esegui una volta:
--   npx tsx scripts/seed-master.ts
-- =============================================================