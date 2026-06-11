-- Migration: drop_messages
-- Descrizione: rimuove la tabella messages, residuo del prototipo iniziale.
-- L'app non la legge né la scrive da nessuna parte (il tipo Message è stato
-- rimosso dal codice). Le policy RLS vengono eliminate insieme alla tabella.

DROP TABLE IF EXISTS messages;
