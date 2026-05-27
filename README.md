# Giumello Express

![Status](https://img.shields.io/badge/status-ready-brightgreen)
![License](https://img.shields.io/badge/license-MIT-yellow)

App web per la gestione di navette interne con supporto a due ruoli:
- `master`: crea e gestisce navette, proposte e utenti
- `base`: consulta navette, prenota posti e propone corse

Il progetto è basato su Next.js con Supabase come backend, PostgreSQL per lo storage e Web Push per le notifiche.

## Caratteristiche principali

- autenticazione username/password con email fittizia `username@navette.internal`
- gestione ruoli `master` / `base`
- CRUD navette con stati `draft`, `confirmed`, `full`, `done`, `cancelled`
- prenotazioni per sé, per altri utenti registrati e per ospiti esterni
- proposte navetta da parte degli utenti base
- notifiche push browser con gestione subscription
- preferenze notifiche personalizzabili per master e utenti base
- schema DB versionato con Supabase migrations

## Stack tecnologico

- Next.js 16
- React 19
- Tailwind CSS 4
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- PostgreSQL
- Web Push (`web-push`)

## Prerequisiti

- Node.js 20+ consigliato
- accesso a un progetto Supabase con URL, chiave anonima e chiave service role
- file `.env.local` non committato contenente le variabili richieste

## Setup locale

1. installa dipendenze:

```bash
npm install
```

2. crea un file `.env.local` con almeno:

```env
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@navette.internal
```

3. avvia l'app in locale:

```bash
npm run dev
```

4. apri `http://localhost:3000`

## Variabili d'ambiente

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

> Non esporre mai `SUPABASE_SERVICE_ROLE_KEY` nel client o in repository pubblici.

## Database e Supabase

Il repository include le migrations in `supabase/migrations/`.

- usa `supabase` CLI per applicare le migration
- non modificare migration già esistenti se il progetto è già in produzione

## Documentazione interna

Consulta la cartella `doc/` per:

- `documentazione-tecnica.md`
- `documentazione-funzionale.md`
- `manuale-utente.md`
- documenti di fase e roadmap

## Licenza

Questo repository è rilasciato con licenza MIT.
Vedi il file `LICENSE` per i termini completi.

## Note importanti per pubblicare

- il repository usa `SUPABASE_SERVICE_ROLE_KEY`: mantieni la chiave solo in environment server
- non caricare `.env.local` o chiavi private su GitHub
- se pubblichi, lascia i documenti storici per tracciare le scelte di progetto

## Comandi utili

```bash
npm run dev
npm run build
npm start
npm run lint
```

## Stato del progetto

L'app è progettata per un utilizzo reale in un contesto chiuso, con gestione utenti, prenotazioni, proposte e notifiche push già implementata.

Se pubblichi questo repository, ricordati di aggiornare la sezione `License` se desideri rendere il progetto disponibile con termini specifici.
