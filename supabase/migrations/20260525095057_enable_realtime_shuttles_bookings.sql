-- Aggiunge shuttles e bookings alla pubblicazione Supabase Realtime.
-- Senza questo, postgres_changes nel browser non riceve nessun evento
-- nonostante le subscription siano correttamente configurate lato client.
ALTER PUBLICATION supabase_realtime ADD TABLE public.shuttles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
