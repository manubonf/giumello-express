-- Tabella profili utente
-- Collegata a auth.users tramite id (UUID)
CREATE TABLE profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT        NOT NULL UNIQUE,
  role        TEXT        NOT NULL DEFAULT 'base' CHECK (role IN ('master', 'base')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Abilita RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Un utente autenticato può leggere solo il proprio profilo
-- Un utente autenticato può leggere tutti gli username (serve per la lista utenti nelle prenotazioni)
CREATE POLICY "Utenti autenticati leggono tutti i profili"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Solo il service_role (backend) può inserire e modificare profili
-- Il frontend non scrive mai direttamente su questa tabella

DROP TABLE IF EXISTS messages;

-- Funzione chiamata dal trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    COALESCE(NEW.raw_user_meta_data->>'role', 'base')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: si attiva dopo ogni INSERT su auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();