# CLAUDE.md — giumello-express

Istruzioni operative per lavorare su questo progetto. Leggile prima di toccare qualsiasi file.

---

## Stack

- **Next.js** (App Router, TypeScript, Tailwind CSS) su Vercel
- **Supabase** (PostgreSQL + Auth + RLS) — schema versionato in Git
- **GitHub** con due branch: `main` → produzione, `develop` → sviluppo/preview

---

## Regole sul database — CRITICHE

**Mai modificare migration già esistenti.** Se serve cambiare lo schema, si crea sempre un nuovo file:

```bash
supabase migration new <nome_descrittivo>
```

**Mai toccare la console Supabase.** Tutto lo schema vive in `supabase/migrations/`. La console è read-only.

**RLS sempre attiva su ogni nuova tabella.** Ogni `CREATE TABLE` deve essere seguito da `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` e dalle policy appropriate. Non lasciare mai tabelle senza RLS.

**Le operazioni di scrittura su `profiles` e `auth.users` avvengono solo via `service_role` nel backend** (Server Actions con `supabaseAdmin`). Il client `anon` non scrive mai su queste tabelle.

**Le transizioni di stato delle navette e il conteggio posti avvengono in funzioni PostgreSQL atomiche** (`book_seats`, `release_seats`), non in logica applicativa Next.js. Non spostare questa logica nel codice.

---

## Autenticazione

Gli utenti non hanno email reali. Il login usa un'email fittizia costruita al volo:

```
username → username@navette.internal
```

Questa costruzione avviene **solo** in `app/login/actions.ts`. Non replicarla altrove.

Il master è l'unico con `role = 'master'` — esiste una sola riga di questo tipo in `profiles`. Non creare logica che presuppone più master.

Gli utenti base non si registrano mai autonomamente. Vengono creati dal master tramite `supabaseAdmin.auth.admin.createUser()` in `app/master/utenti/nuovo/actions.ts`.

---

## Client Supabase — quale usare

| Contesto | Client | File |
|---|---|---|
| Server Components, Server Actions | `createSupabaseServerClient()` | `lib/supabase-server.ts` |
| Operazioni admin (crea/elimina utenti) | `supabaseAdmin` | `lib/supabase.ts` |
| Client Components (se necessario) | `createBrowserClient()` | da `@supabase/ssr` |

Non usare `supabaseAdmin` in Client Components. Non usare il client browser in Server Actions.

---

## Helper di autenticazione

```typescript
// Ottiene utente corrente — redirect a /login se non autenticato
const { user, profile } = await getCurrentUser()

// Come sopra, ma redirect a / se non è master
const profile = await requireMaster()
```

Entrambi sono in `lib/auth.ts`. Usali sempre invece di chiamare `supabase.auth.getUser()` direttamente nelle route.

---

## Protezione route

La protezione route avviene in `proxy.ts` (Next.js 16 — `middleware.ts` è deprecato). Gestisce già:

- `/login` — pubblica, redirect a `/` se già loggato
- `/*` — richiede autenticazione
- `/master/*` — richiede `role = 'master'`

La funzione esportata si chiama `proxy`, non `middleware`. Il runtime è Node.js — non usare API Edge-only in questo file.

Non aggiungere controlli di autenticazione ridondanti nei Server Components se `proxy.ts` copre già la route.

---

## Struttura route

```
/                          → homepage (nav per ruolo)
/login                     → login username+password
/navette                   → lista navette (utenti base)
/navette/[id]              → dettaglio + prenotazione
/prenotazioni              → prenotazioni attive e storico
/proposte                  → proposte utente
/master/navette            → lista navette (master)
/master/navette/nuova      → crea navetta
/master/navette/[id]       → dettaglio + azioni master
/master/utenti             → lista utenti
/master/utenti/nuovo       → crea utente
/master/impostazioni       → soglia minima passeggeri
```

---

## Regole RLS per ruolo

| Tabella | Utente base | Master |
|---|---|---|
| `profiles` | SELECT tutti | SELECT tutti |
| `shuttles` | SELECT (escluse `cancelled`) | SELECT tutto |
| `bookings` | SELECT proprie | SELECT tutto |
| `booking_participants` | SELECT proprie | SELECT tutto |
| `proposals` | SELECT proprie | SELECT tutto |
| `app_settings` | SELECT | SELECT + UPDATE (via service_role) |
| `push_subscriptions` | ALL proprie | ALL proprie |

INSERT/UPDATE/DELETE su `profiles` e `auth.users`: solo `service_role`.

---

## Ciclo di vita navette

```
draft → confirmed → done / cancelled
draft → confirmed → full → done / cancelled
draft → cancelled
confirmed → cancelled
confirmed → full → done / cancelled
```

Le transizioni automatiche (`draft → confirmed` al raggiungimento di `min_seats`, `confirmed → full` quando `available_seats = 0`) avvengono nella funzione PostgreSQL `book_seats`. Non replicare questa logica in Next.js.

Il master può promuovere manualmente `draft → confirmed` in qualsiasi momento. Può annullare in qualsiasi stato tranne `done`.

`min_seats` è uno snapshot al momento della creazione della navetta (copiato da `app_settings.min_interest_threshold`). Non rileggere `app_settings` per valutare navette già esistenti.

---

## Comandi quotidiani

```bash
# Sviluppo locale
supabase start                        # avvia Supabase locale (richiede Docker)
supabase stop                         # ferma Supabase locale
supabase db reset                     # reset completo: migrations + seed (stato pulito)
supabase status                       # mostra URL e chiavi attive
npm run dev                           # avvia Next.js su http://localhost:3000

# Schema DB
supabase migration new <nome>         # crea nuova migration (SEMPRE, mai modificare esistenti)
supabase db push                      # applica migrations al progetto remoto collegato

# Seed master (una volta sola per ambiente)
npx tsx scripts/seed-master.ts

# Git
git checkout -b feature/<nome>        # nuova feature da develop
git push origin develop               # → Preview deploy + migrations DEV
# develop → main via PR               → Production deploy + migrations PROD
```

---

## Variabili d'ambiente

```
NEXT_PUBLIC_SUPABASE_URL          URL del progetto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY     Chiave pubblica anon
SUPABASE_SERVICE_ROLE_KEY         Chiave admin — MAI esporre al client
```

`.env.local` non va mai committato. È già in `.gitignore`.

---

## Cose da non fare mai

- ❌ Modificare file in `supabase/migrations/` già esistenti
- ❌ Usare la console Supabase per modificare lo schema
- ❌ Esporre `SUPABASE_SERVICE_ROLE_KEY` in Client Components o nel bundle client
- ❌ Implementare logica di transizione stato navette fuori da PostgreSQL
- ❌ Permettere sign-up pubblici (sono disabilitati — non riattivarli)
- ❌ Creare più di un utente con `role = 'master'`
- ❌ Usare `supabase.auth.getUser()` direttamente nelle route invece degli helper in `lib/auth.ts`
- ❌ Creare o rinominare `proxy.ts` in `middleware.ts` — è deprecato in Next.js 16
- ❌ Usare API Edge-only in `proxy.ts` — il runtime è Node.js, non Edge