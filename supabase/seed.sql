-- =============================================================
-- SEED LOCALE — eseguito dopo ogni `supabase db reset`
-- Questi dati esistono SOLO nell'ambiente locale di sviluppo
-- =============================================================


-- =============================================================
-- NOTA: l'utente master NON viene creato qui.
-- auth.users è gestito da Supabase Auth e non è modificabile
-- via seed SQL in modo affidabile.
-- Per creare il master in locale, esegui una volta:
--   npx tsx scripts/seed-master.ts
-- =============================================================