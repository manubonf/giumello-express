# Documentazione tecnica — App Navette

## 1. Panoramica
L'app è una web app Next.js + Supabase costruita per gestire navette, prenotazioni e proposte in un ambiente chiuso. È stata realizzata con l'obiettivo di far funzionare un servizio reale con ruoli distinti, accesso controllato, RLS, notifiche push e operazioni sicure lato server.

## 2. Stack tecnico
- Frontend / backend: `Next.js` con App Router e Server Actions
- Database: `Supabase` / PostgreSQL
- Autenticazione: `Supabase Auth` con email fittizia `username@navette.internal`
- Notifiche push: `Web Push API` con service worker in `public/sw.js`
- Librerie di supporto: `@supabase/supabase-js`, `@supabase/ssr`, `web-push`

## 3. Architettura
- `lib/supabase.ts`: client admin e anon per operazioni server e backend
- `lib/supabase-server.ts`: `createSupabaseServerClient()` per SSR e Server Actions
- `lib/auth.ts`: helper `getCurrentUser()`, `requireMaster()`, `getMasterUser()`
- `proxy.ts`: protezione route globale, redirect in base al ruolo
- `app/*`: pagine e server actions organizzate per route e ruolo
- `supabase/migrations/`: schema versionato

## 4. Autenticazione e ruoli
- Login con username + password: `app/login/actions.ts` costruisce l'email fittizia `username@navette.internal`
- Single sign-on non usato; l'autenticazione usa Supabase Auth e JWT
- Ruoli definiti in tabella `profiles`: `master` e `base`
- Route protette in `proxy.ts`:
  - `/login`: pubblica se non autenticato
  - `/master/*`: solo `master`
  - `/base/*`: solo `base`
  - `/`: redirect in base al ruolo

## 5. Database schema
### 5.1 `profiles`
- `id UUID` (pari a `auth.users.id`)
- `username TEXT UNIQUE`
- `role TEXT CHECK ('master'|'base')`
- colonne preferenze notifiche (`notif_m*`, `notif_u*`)
- trigger `on_auth_user_created` popola automaticamente il profilo quando Supabase crea un utente
- RLS: lettura consentita agli autenticati, scrittura gestita dal backend

### 5.2 `app_settings`
- `id INT PRIMARY KEY DEFAULT 1`
- `min_interest_threshold INT`
- mantiene uno snapshot globale per impostazioni
- RLS: lettura pubblica, update solo service role

### 5.3 `push_subscriptions`
- `id UUID`, `user_id UUID`, `endpoint`, `p256dh`, `auth_key`
- RLS: solo il proprietario può gestire le proprie subscription

### 5.4 `shuttles`
- `status` in `draft|confirmed|full|done|cancelled`
- `departure_time`, `max_seats`, `available_seats`, `min_seats`
- `created_by` e `proposal_id`
- `min_seats` snapshot al momento della creazione
- `available_seats` gestito atomico tramite funzioni SQL

### 5.5 `bookings` e `booking_participants`
- `bookings`: `shuttle_id`, `booker_id`, `created_at`, uniqueness su `(shuttle_id, booker_id)`
- `booking_participants`: partecipanti registrati o ospiti, con `participant_xor`
- `user_id` fa FK su `profiles` per permettere join PostgREST
- RLS: utenza base vede prenotazioni proprie, master vede tutto

### 5.6 `proposals`
- `proposer_id`, `departure_time`, `notes`, `status` in `pending|accepted|rejected`
- tutti gli utenti autenticati leggono tutte le proposte
- le transizioni di stato sono gestite da Server Actions con `supabaseAdmin`

## 6. Protezione e logica server-side
- `app/master/layout.tsx` protegge tutte le pagine master a livello di route
- server actions di create/confirm/cancel/update richiedono `getMasterUser()` o `getCurrentUser()`
- `supabaseAdmin` usato per operazioni con service role e per bypassare RLS quando necessario
- le azioni sono implementate come `server` modules con redirect in caso di errori

## 7. Ciclo di vita navette
- `draft → confirmed → done`
- `draft → confirmed → full → done`
- `draft → cancelled`
- `confirmed → cancelled`
- `confirmed → full → cancelled`

Transizioni automatiche:
- `available_seats == 0` → `full`
- `draft` raggiunge `min_seats` → `confirmed`

## 8. Prenotazioni e logica booking
- il booker può prenotare per sé, per altri utenti registrati o per ospiti esterni
- un utente non può comparire due volte sulla stessa navetta
- il master può prenotare utenti registrati e ospiti esterni, ma non se stesso come partecipante base
- `book_seats` e `release_seats` gestiscono i posti con lock SQL e aggiornamenti atomici
- se la prenotazione fallisce a metà, il codice ripristina `available_seats`

## 9. Notifiche push
### Implementazione reale verificata
- `lib/push.ts`: invio Web Push con `web-push`, gestione di errori 410/404, pulizia endpoints scaduti
- `lib/notif.ts`: mappa eventi a preferenze `notif_m*` e `notif_u*`, deduplica U4/U5 e U6/U7
- `app/api/push/subscribe/route.ts`: POST/DELETE per salvare o rimuovere subscription
- `public/sw.js`: service worker per `push` e `notificationclick`
- `components/ui/push-subscribe.tsx`: registrazione service worker, subscribe/unsubscribe, UI pulsante
- `app/base/impostazioni/page.tsx` e `app/master/impostazioni/page.tsx`: pagine impostazioni con toggle preferenze

### Eventi supportati
- proposta creata
- proposta rifiutata
- creazione navetta in bozza
- creazione navetta confermata direttamente
- cambio di stato navetta
- aggiornamento posti
- annullamento navetta
- cambi stato automatici/automatici di conferma

## 10. Stato di coerenza con i documenti
- Tutte le fasi principali (1–4, 6) sono implementate nel codice
- Fase 5 è implementata: le notifiche push non sono solo documentate, ma esistenti e funzionanti
- Le preferenze notifiche sono presenti in schema e UI
- La casistica di booking multi-partecipante è effettivamente coperta da `bookSelf`, `bookOtherUser`, `bookGuest`

## 11. Verifica aggiuntiva
File chiave verificati:
- `app/login/actions.ts`
- `lib/auth.ts`
- `proxy.ts`
- `app/base/navette/actions.ts`
- `app/master/navette/actions.ts`
- `app/base/proposte/actions.ts`
- `app/master/proposte/actions.ts`
- `lib/push.ts`
- `lib/notif.ts`
- `app/api/push/subscribe/route.ts`
- `components/ui/push-subscribe.tsx`
- `public/sw.js`
- `app/base/impostazioni/page.tsx`
- `app/master/impostazioni/page.tsx`

## 12. Note tecniche rilevate
- Le API push e le preferenze sono già implementate e collegate
- Il sistema di role-based redirect è basato su `proxy.ts` e non su `middleware.ts`
- La password mnemonica master/utente base è generata in `app/master/utenti/actions.ts`
- Il service worker è incluso in produzione come `public/sw.js`
