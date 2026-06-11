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

// Versione master-only per Server Actions — redirect a / se non è master
const user = await getMasterUser()

// Zero query DB: legge id/role/username dagli header iniettati da proxy.ts.
// Da preferire nei Server Component dove proxy.ts protegge già la route.
const { userId, role, username } = await getSessionFromHeaders()
```

Tutti e tre sono in `lib/auth.ts`. Usali sempre invece di chiamare `supabase.auth.getUser()` direttamente nelle route.

---

## Protezione route

La protezione route avviene in `proxy.ts` (Next.js 16 — `middleware.ts` è deprecato). Gestisce già:

- `/login` — pubblica, redirect a `/` se già loggato
- `/base/*` — solo `role = 'base'`; il master viene reindirizzato a `/master`
- `/master/*` — solo `role = 'master'`; gli altri vengono reindirizzati a `/`
- `/` — redirect automatico a `/master` se il profilo è master

La funzione esportata si chiama `proxy`, non `middleware`. Il runtime è Node.js — non usare API Edge-only in questo file.

Non aggiungere controlli di autenticazione ridondanti nei Server Components se `proxy.ts` copre già la route.

---

## Struttura route

```
/                          → homepage (nav per ruolo)
/login                     → login username+password
/base/navette              → lista navette (utenti base)
/base/navette/[id]         → dettaglio + prenotazione
/base/proposte             → lista proposte utente
/base/proposte/nuova       → crea proposta
/base/proposte/[id]        → modifica/cancellazione proposta
/base/impostazioni         → impostazioni (notifiche personalizzate)
/master/navette            → lista navette (master)
/master/navette/nuova      → crea navetta
/master/navette/[id]       → dettaglio + azioni master
/master/utenti             → lista utenti (con badge ammonizioni)
/master/utenti/nuovo       → crea utente
/master/utenti/[id]        → dettaglio utente + ammonizioni
/master/impostazioni       → impostazioni notifiche master
/master/proposte           → lista proposte da utente base
/master/proposte/[id]      → pannello di creazione navetta o rifiuto proposta
```

---

## Regole RLS per ruolo

| Tabella | Utente base | Master |
|---|---|---|
| `profiles` | SELECT tutti | SELECT tutti |
| `shuttles` | SELECT (escluse `cancelled`) | SELECT tutto |
| `bookings` | SELECT proprie | SELECT tutto |
| `booking_participants` | SELECT proprie | SELECT tutto |
| `booking_cancellations` | nessun accesso | SELECT tutto |
| `proposals` | SELECT proprie | SELECT tutto |
| `push_subscriptions` | ALL proprie | ALL proprie |
| `user_favorites` | ALL propri | ALL propri |
| `ammonizioni` | nessun accesso | ALL |

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

`min_seats` è uno snapshot al momento della creazione della navetta. Non modificarne il valore dopo la creazione per rivalutare navette già esistenti.

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
NEXT_PUBLIC_VAPID_PUBLIC_KEY      Chiave pubblica VAPID per Web Push
VAPID_PRIVATE_KEY                 Chiave privata VAPID — MAI esporre al client
VAPID_SUBJECT                     Contatto VAPID (es. mailto:admin@navette.internal)
```

`.env.local` non va mai committato. È già in `.gitignore`.

---

## Scadenza automatica navette e proposte

Non esistono cron job. Le funzioni di pulizia vengono chiamate tramite `after()` all'inizio di ogni pagina che le usa:

```typescript
after(() => markExpiredShuttlesDone())        // navette con departure_time passato → done
after(() => markExpiredProposalsCancelled())   // proposte scadute → cancelled
```

`after()` esegue in background dopo che la risposta è stata inviata al client, senza rallentare il caricamento. Lo svantaggio è che se nessuno visita le pagine per un periodo prolungato, lo stato resta obsoleto — accettabile per l'uso previsto (team piccolo, accesso quotidiano).

Non aggiungere cron job Vercel per questo: `after()` è sufficiente e introduce meno complessità operativa.

---

## Notifiche Push

Le preferenze sono colonne booleane su `profiles` (`notif_m1`–`notif_m6` per il master, `notif_u1`–`notif_u12` per gli utenti base). Default `true` per tutte.

Il flusso è:
1. Il browser si iscrive via `/api/push/subscribe` → salva endpoint in `push_subscriptions`
2. Le Server Actions triggherano le notifiche con `after()` (non bloccante)
3. `lib/notif.ts` raccoglie i destinatari filtrando per preferenza
4. `lib/push.ts` invia via Web Push e pulisce automaticamente gli endpoint scaduti (410/404)

Non inviare notifiche direttamente da Server Components o Client Components. Usare sempre `after()` nelle Server Actions.

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