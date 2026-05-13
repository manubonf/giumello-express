# Guida Completa: GitHub + Supabase + Vercel
### Stack moderno — Dal repo al deploy, con schema versionato in Git

---

## Panoramica dell'architettura

```
GitHub (sorgente unica di verità)
    ├── branch: main      → Vercel Production  + Supabase Production
    └── branch: develop   → Vercel Preview/Dev + Supabase Staging

supabase/migrations/      → schema del DB versionato come codice
.github/workflows/        → CI che applica le migrations automaticamente
```

**Stack:**
- **Next.js** — framework frontend/backend (ottimizzato per Vercel)
- **Supabase** — database PostgreSQL hosted + API REST automatica
- **Vercel** — hosting e deploy automatico da GitHub
- **Supabase CLI** — gestione schema via file SQL nel repo

---

## FASE 1 — Prerequisiti

Prima di iniziare, assicurati di avere:

- [ ] **Node.js** ≥ 18 → https://nodejs.org
- [ ] **Git** → https://git-scm.com
- [ ] **Docker Desktop** (per Supabase locale) → https://www.docker.com/products/docker-desktop
- [ ] Account **GitHub** → https://github.com
- [ ] Account **Supabase** → https://supabase.com (piano gratuito disponibile)
- [ ] Account **Vercel** → https://vercel.com (piano gratuito disponibile)

Verifica da terminale:

```bash
node -v        # es. v20.x.x
npm -v         # es. 10.x.x
git --version  # es. git version 2.x.x
docker -v      # es. Docker version 24.x.x
```

---

## FASE 2 — Installare Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Windows (con Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux / alternativa cross-platform
npm install -g supabase

# Verifica
supabase --version
```

---

## FASE 3 — Creare il progetto Next.js

```bash
# 1. Crea il progetto
npx create-next-app@latest giumello-express

# Rispondi così al wizard interattivo:
# ✔ Would you like to use TypeScript?              → Yes
# ✔ Would you like to use ESLint?                  → Yes
# ✔ Would you like to use Tailwind CSS?            → Yes
# ✔ Would you like to use `src/` directory?        → No
# ✔ Would you like to use App Router?              → Yes
# ✔ Would you like to customize the import alias?  → No

# 2. Entra nella cartella
cd giumello-express

# 3. Installa il client Supabase
npm install @supabase/supabase-js
```

---

## FASE 4 — Inizializzare Supabase nel progetto

```bash
# Dalla root del progetto
supabase init
```

Questo crea la cartella `supabase/` con la seguente struttura:

```
supabase/
├── config.toml      ← configurazione ambiente locale (porta, studio, ecc.)
├── migrations/      ← file SQL versionati — lo schema vive qui
└── seed.sql         ← dati iniziali solo per sviluppo locale
```

> ✅ Questa cartella va **committata nel repository**. È la fonte di verità del database.

---

## FASE 5 — Creare la prima migration

Invece di usare la console Supabase, crei un file SQL versionato:

```bash
supabase migration new create_messages_table
```

Viene creato il file (il prefisso timestamp garantisce l'ordine):
```
supabase/migrations/20240101120000_create_messages_table.sql
```

Aprilo e scrivi:

```sql
-- Migration: create_messages_table
-- Descrizione: tabella principale dei messaggi

CREATE TABLE messages (
  id          UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
  text        TEXT      NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Abilita Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: lettura pubblica (anonima)
CREATE POLICY "Allow public read"
  ON messages FOR SELECT
  USING (true);
```

### Dati di seed (solo per sviluppo locale)

Apri `supabase/seed.sql` e scrivi:

```sql
-- Questi dati vengono inseriti solo in locale dopo ogni `supabase db reset`
INSERT INTO messages (text) VALUES
  ('Hello World da Supabase! 🎉'),
  ('Schema gestito da Git ✅'),
  ('Secondo messaggio di test 🛠️');
```

---

## FASE 6 — Avviare Supabase in locale e testare

```bash
# Avvia l'istanza locale (richiede Docker Desktop in esecuzione)
supabase start
```

Output atteso:
```
Started supabase local development setup.

         API URL: http://localhost:54321
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323    ← dashboard locale nel browser
        anon key: eyJh...                  ← copia questa chiave
```

### Comandi essenziali

```bash
supabase start        # avvia tutto
supabase stop         # ferma tutto
supabase db reset     # cancella e riapplica migrations + seed (stato pulito)
supabase status       # mostra URL e chiavi attive
```

> 💡 `supabase db reset` è il comando più utile in sviluppo: riporta il DB locale
> a uno stato pulito e identico in pochi secondi. Perfetto dopo ogni modifica allo schema.

---

## FASE 7 — Scrivere l'applicazione Hello World

### 7.1 — Creare il client Supabase

Crea il file `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### 7.2 — Homepage che legge dal database

Sostituisci il contenuto di `app/page.tsx`:

```tsx
import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })

  const env = process.env.NODE_ENV

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-10">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            👋 Hello World!
          </h1>
          <p className="text-gray-500 text-sm">
            Ambiente:{' '}
            <span className={`font-semibold ${env === 'production' ? 'text-green-600' : 'text-blue-600'}`}>
              {env === 'production' ? '🟢 Production' : '🔵 Development'}
            </span>
          </p>
        </div>

        {/* Contenuto */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            ❌ Errore Supabase: {error.message}
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              📨 Messaggi dal database:
            </h2>
            {messages && messages.length > 0 ? (
              <ul className="space-y-3">
                {messages.map((msg) => (
                  <li key={msg.id} className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <p className="text-gray-800">{msg.text}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(msg.created_at).toLocaleString('it-IT')}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 italic">Nessun messaggio trovato.</p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
          Next.js + Supabase + Vercel — Stack completo ✅
        </div>
      </div>
    </main>
  )
}
```

### 7.3 — Variabili d'ambiente locali

Crea il file `.env.local` nella root del progetto (usa i valori mostrati da `supabase start`):

```env
# .env.local — Supabase locale (Docker)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...   # anon key mostrata da supabase start
```

> ⚠️ Questo file **non deve mai finire su GitHub**. Verifica che `.gitignore` contenga:
> ```
> .env*.local
> ```

### 7.4 — Test in locale

```bash
npm run dev
# Apri http://localhost:3000
# Dovresti vedere i messaggi del seed con "🔵 Development"
```

---

## FASE 8 — Creare i progetti Supabase remoti (Dev e Production)

Per gli ambienti remoti servono **due progetti Supabase separati**.

### 8.1 — Crea il progetto DEV remoto

1. Vai su https://supabase.com/dashboard
2. Clicca **"New project"**
3. Compila:
   - **Name**: `hello-world-dev`
   - **Database Password**: scegli una password sicura e salvala
   - **Region**: la più vicina (es. `West EU - Ireland`)
4. Clicca **"Create new project"** e attendi ~2 minuti

### 8.2 — Crea il progetto PRODUCTION

Ripeti gli stessi passi con:
- **Name**: `hello-world-prod`
- Stessa region, password diversa

### 8.3 — Recupera le credenziali

Per **ciascun** progetto, vai su **Settings → API** e copia:
- **Project URL** (es. `https://abcdef.supabase.co`)
- **anon public** key

Tienile a portata di mano per i passi successivi.

---

## FASE 9 — Applicare le migrations ai progetti remoti

```bash
# Login alla CLI Supabase
supabase login    # apre il browser per autenticarsi

# Collega al progetto DEV e applica le migrations
supabase link --project-ref TUO_PROJECT_ID_DEV
# inserisci la DB password DEV quando richiesta
supabase db push

# Collega al progetto PROD e applica le migrations
supabase link --project-ref TUO_PROJECT_ID_PROD
# inserisci la DB password PROD quando richiesta
supabase db push
```

> 💡 Il `project-id` è visibile nell'URL del dashboard:
> `https://supabase.com/dashboard/project/`**`abcdefghijklmnop`**

Ora entrambi i database remoti hanno lo stesso schema, partendo dai file nel repository.

---

## FASE 10 — Creare il repository GitHub

```bash
# 1. Primo commit (dalla root del progetto)
git add .
git commit -m "feat: initial Hello World app — Next.js + Supabase migrations"

# 2. Crea un repo vuoto su https://github.com/new
#    Chiamalo "giumello-express"
#    Lascia VUOTO: niente README, .gitignore o licenza

# 3. Collega e pusha su main
git remote add origin https://github.com/TUO_USERNAME/giumello-express.git
git branch -M main
git push -u origin main

# 4. Crea il branch develop
git checkout -b develop
git push -u origin develop
```

Struttura branch:
- `main` → **Production**
- `develop` → **Development / Preview**

---

## FASE 11 — Automazione migrations con GitHub Actions

Crea il file `.github/workflows/supabase-migrations.yml`:

```yaml
name: Supabase Migrations

on:
  push:
    branches:
      - main       # → applica su PROD
      - develop    # → applica su DEV

jobs:
  migrate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Apply migrations → DEV
        if: github.ref == 'refs/heads/develop'
        run: |
          supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_ID_DEV }}
          supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD:  ${{ secrets.SUPABASE_DB_PASSWORD_DEV }}

      - name: Apply migrations → PROD
        if: github.ref == 'refs/heads/main'
        run: |
          supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_ID_PROD }}
          supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD:  ${{ secrets.SUPABASE_DB_PASSWORD_PROD }}
```

### Configura i Secrets su GitHub

Vai su **GitHub → Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Come ottenerlo |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | https://supabase.com/dashboard/account/tokens → "Generate new token" |
| `SUPABASE_PROJECT_ID_DEV` | URL dashboard progetto DEV (la parte dopo `/project/`) |
| `SUPABASE_PROJECT_ID_PROD` | URL dashboard progetto PROD |
| `SUPABASE_DB_PASSWORD_DEV` | Password scelta alla creazione del progetto DEV |
| `SUPABASE_DB_PASSWORD_PROD` | Password scelta alla creazione del progetto PROD |

Committa e pusha il workflow:

```bash
git add .github/
git commit -m "ci: auto-apply supabase migrations on push"
git push origin develop
```

---

## FASE 12 — Deploy su Vercel

### 12.1 — Importa il progetto

1. Vai su https://vercel.com/new
2. Clicca **"Import Git Repository"**
3. Autorizza GitHub se richiesto
4. Seleziona `giumello-express` e clicca **"Import"**

### 12.2 — Configura le variabili d'ambiente di PRODUCTION

Nella schermata di configurazione, apri **"Environment Variables"** e aggiungi:

| Nome | Valore | Environment |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL progetto **PROD** | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key progetto **PROD** | Production |

Clicca **"Deploy"** → attendi il primo deploy (~1-2 minuti).

### 12.3 — Configura le variabili d'ambiente di DEVELOPMENT

Dopo il deploy, vai su **Settings → Environment Variables** e aggiungi le variabili DEV:

| Nome | Valore | Environment |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL progetto **DEV** | Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key progetto **DEV** | Preview |

### 12.4 — Verifica branch configuration

In Vercel, vai su **Settings → Git**:
- **Production Branch**: `main` (già impostato)
- Ogni push su qualsiasi altro branch genera automaticamente un **Preview deployment**

Quindi: `develop` → Preview deploy con Supabase DEV, `main` → Production con Supabase PROD.

---

## FASE 13 — Workflow quotidiano

```
┌─────────────────────────────────────────────────────────┐
│                    SVILUPPO LOCALE                       │
│  npm run dev  →  usa .env.local  →  Supabase locale     │
│  supabase db reset  →  schema pulito + seed             │
└───────────────────────┬─────────────────────────────────┘
                        │ git push origin develop
                        ▼
┌─────────────────────────────────────────────────────────┐
│              VERCEL PREVIEW + SUPABASE DEV               │
│  GitHub Actions → supabase db push → DB DEV aggiornato  │
│  Vercel → preview deploy automatico                      │
│  URL: giumello-express-git-develop-xxx.vercel.app         │
└───────────────────────┬─────────────────────────────────┘
                        │ Pull Request develop → main
                        │ (code review, approvazione)
                        ▼
┌─────────────────────────────────────────────────────────┐
│            VERCEL PRODUCTION + SUPABASE PROD             │
│  GitHub Actions → supabase db push → DB PROD aggiornato │
│  Vercel → deploy production automatico                   │
│  URL: giumello-express.vercel.app                         │
└─────────────────────────────────────────────────────────┘
```

### Comandi tipici per una feature

```bash
# Parti sempre da develop
git checkout develop
git pull origin develop

# Crea il branch della feature
git checkout -b feature/aggiungo-autore

# Modifica schema → nuova migration
supabase migration new add_author_to_messages
# edita il file SQL creato

# Testa in locale
supabase db reset
npm run dev

# Aggiorna codice Next.js se necessario, poi committa
git add .
git commit -m "feat(db): add author column to messages"
git push origin feature/aggiungo-autore

# Merge in develop per il test in Preview
git checkout develop
git merge feature/aggiungo-autore
git push origin develop
# → GitHub Actions applica migration su DEV
# → Vercel crea Preview deploy

# Quando tutto è ok: vai in Production
git checkout main
git merge develop
git push origin main
# → GitHub Actions applica migration su PROD
# → Vercel fa il deploy Production
```

---

## FASE 14 — Aggiungere modifiche future allo schema

Il flusso è sempre lo stesso: **mai toccare la console Supabase**, tutto passa da file SQL.

```bash
# Esempio: aggiungere una colonna
supabase migration new add_author_to_messages
```

Edita il file creato:

```sql
-- Aggiunge colonna author alla tabella messages
ALTER TABLE messages
  ADD COLUMN author TEXT NOT NULL DEFAULT 'anonymous';
```

```bash
# Testa subito in locale
supabase db reset    # riapplica migration 1 + migration 2 + seed

# Committa e pusha → CI fa il resto
git add supabase/migrations/
git commit -m "feat(db): add author column to messages"
git push origin develop
```

> ✅ Schema e codice viaggiano sempre nello stesso commit.
> Impossibile avere un DB non allineato con l'applicazione deployata.

---

## Verifica finale — Checklist completa

### In locale ✅
- [ ] `supabase start` avvia senza errori
- [ ] `supabase db reset` applica migrations e seed
- [ ] `npm run dev` mostra messaggi dal DB locale con "🔵 Development"
- [ ] `supabase stop` ferma tutto pulitamente

### Ambiente DEV (Preview) ✅
- [ ] Push su `develop` trigghera GitHub Actions → migration applicata su Supabase DEV
- [ ] Vercel crea un Preview deploy automatico
- [ ] L'URL preview mostra "🔵 Development" e legge da Supabase DEV

### Ambiente PROD (Production) ✅
- [ ] Push su `main` trigghera GitHub Actions → migration applicata su Supabase PROD
- [ ] Vercel fa il deploy Production automatico
- [ ] L'URL production mostra "🟢 Production" e legge da Supabase PROD

---

## Struttura finale del repository

```
giumello-express/
├── .github/
│   └── workflows/
│       └── supabase-migrations.yml   ← CI automatico per le migrations
├── app/
│   ├── page.tsx                      ← Homepage Hello World
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   └── supabase.ts                   ← Client Supabase condiviso
├── supabase/
│   ├── config.toml                   ← Config ambiente locale
│   ├── seed.sql                      ← Dati di test (solo locale)
│   └── migrations/
│       ├── 20240101120000_create_messages_table.sql
│       └── 20240215093000_add_author_to_messages.sql
├── .env.local                        ← ⚠️ NON committare mai
├── .gitignore                        ← deve includere .env*.local
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## Appendice — Comandi di riferimento rapido

```bash
# Supabase CLI
supabase start                             # avvia ambiente locale
supabase stop                              # ferma ambiente locale
supabase db reset                          # reset completo: migrations + seed
supabase migration new <nome>              # crea una nuova migration
supabase db push                           # applica migrations al progetto remoto collegato
supabase link --project-ref <id>           # collega CLI a un progetto remoto
supabase status                            # mostra URL e chiavi attive
supabase login                             # autenticazione CLI

# Git
git checkout -b feature/<nome>             # nuova feature branch
git push origin develop                    # → Preview deploy + migrations DEV
git push origin main                       # → Production deploy + migrations PROD

# Next.js
npm run dev                                # server locale su http://localhost:3000
npm run build                              # build di produzione locale
npm start                                  # avvia la build locale

# Vercel CLI (opzionale)
npm i -g vercel
vercel                                     # deploy Preview manuale
vercel --prod                              # deploy Production manuale
```

---

*Stack: Next.js 14+ · TypeScript · Tailwind CSS · Supabase · Vercel · GitHub Actions*
