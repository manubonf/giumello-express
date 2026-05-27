# Documentazione funzionale — App Navette

## 1. Finalità dell'app
L'app permette a un gruppo chiuso di gestire navette per date e orari programmati, raccogliere prenotazioni e gestire proposte utente. La tratta è fissa; cambia solo la data/orario.

## 2. Ruoli utente
### Master
- unico utente con ruolo `master`
- crea e gestisce navette
- può creare navette in bozza o confermate
- approva o rifiuta proposte utente
- crea e cancella utenti base
- gestisce impostazioni globali e notifiche

### Utente base
- accede solo se creato dal master
- vede navette disponibili in stato `draft`, `confirmed`, `full`
- può prenotare per sé, altri utenti registrati o ospiti esterni
- propone nuove navette al master
- può gestire le proprie preferenze notifiche

## 3. Flussi principali
### Login
- accesso con username + password
- l'email è costruita internamente come `username@navette.internal`
- il login avviene da `/login`

### Home
- se `master` → redirect a `/master`
- se `base` → redirect a `/base/navette`

### Creazione navetta (master)
- route: `/master/navette/nuova`
- campi: data/ora, posti totali, soglia minima opzionale
- se `min_seats = 0`, la navetta è creata direttamente in `confirmed`
- altrimenti è in `draft`

### Gestione navetta (master)
- route: `/master/navette/[id]`
- azioni possibili:
  - `draft` → `confirm`
  - `draft`/`confirmed`/`full` → `cancel`
  - `confirmed`/`full` → `done`
  - aggiornare posto massimo, soglia, orario
- il master vede contatori e prenotazioni complete

### Visualizzazione navette (utente base)
- route: `/base/navette`
- mostra navette `draft`, `confirmed`, `full`
- indica se una navetta è in bozza e non garantita

### Prenotazione navetta (utente base)
- route: `/base/navette/[id]`
- opzioni di prenotazione:
  - `prenota per sé` (`bookSelf`)
  - `prenota altro utente registrato` (`bookOtherUser`)
  - `prenota ospite esterno` (`bookGuest`)
- controlli di validità:
  - non duplicare un utente già prenotato sulla stessa navetta
  - non prenotare un master come partecipante
  - non prenotare se la navetta è completa o non prenotabile

### Cancellazione prenotazione
- il booker può cancellare la propria prenotazione
- un partecipante può lasciare una prenotazione altrui
- il posto viene liberato atomico con `release_seats`

### Proposta navetta (utente base)
- route: `/base/proposte/nuova`
- campi: data/ora e note opzionali
- lo stato iniziale è `pending`
- la proposta rimane visibile in `/base/proposte`

### Gestione proposte (master)
- route: `/master/proposte`
- due sezioni: `pending` e storico
- dettaglio proposta: accetta o rifiuta
- accettare crea una navetta in bozza collegata alla proposta
- rifiutare imposta `status = rejected`

### Gestione utenti (master)
- route: `/master/utenti`
- crea nuovi utenti base con username e password mnemonica generata automaticamente
- rimuove utenti base
- reset password per utenti base

### Impostazioni notifiche
- route base: `/base/impostazioni`
- route master: `/master/impostazioni`
- attiva/disattiva notifiche push sul dispositivo corrente
- toggle per preferenze eventi push

## 4. Stato delle navette
- `draft`: visibile e prenotabile, ma non garantita
- `confirmed`: garantita, aperta alla prenotazione
- `full`: posti esauriti
- `done`: navetta effettuata, storico
- `cancelled`: navetta annullata, storico

## 5. Logica di transizione automatica
- `draft` raggiunge `min_seats` → `confirmed`
- `available_seats` raggiunge `0` → `full`
- `full` che libera posti può tornare a `confirmed`
- il backend mantiene le transizioni in `book_seats` / `release_seats`

## 6. Preferenze notifiche
### Master
- M1: nuova proposta ricevuta
- M2: nuova prenotazione su una navetta
- M3: prenotazione modificata su una navetta
- M4: prenotazione cancellata su una navetta
- M5: navetta confermata automaticamente
- M6: navetta tornata in bozza per posti insufficienti

### Utente base
- U1: nuova proposta da un altro utente
- U2: nuova navetta disponibile in bozza
- U3: nuova navetta confermata direttamente
- U4: cambio stato navetta (tutte)
- U5: cambio stato navetta (prenotate)
- U6: aggiornamento posti (tutte)
- U7: aggiornamento posti (prenotate)
- U8: proposta rifiutata
- U9: navetta annullata (solo prenotate)

## 7. Coerenza implementativa
- la maggior parte delle funzionalità descritte nei documenti in `doc/` è implementata nel codice
- l'impianto notifiche push è già operativo e non solo pianificato
- le preferenze sui profili sono state aggiunte con migration e gestite nell'UI
- le azioni master e base per booking/proposte/navette sono presenti e allineate con i flussi

## 8. Mappa funzionale verso il codice
- `app/base/navette/actions.ts` — prenotazioni base, logica di bookSelf/bookOtherUser/bookGuest
- `app/master/navette/actions.ts` — gestione navette e booking master
- `app/base/proposte/actions.ts` — creazione proposte e notifiche al master
- `app/master/proposte/actions.ts` — accept/reject proposal
- `app/master/utenti/actions.ts` — creazione, reset e cancellazione utenti
- `app/master/impostazioni/actions.ts` — preferenze master
- `app/base/impostazioni/actions.ts` — preferenze base
- `lib/notif.ts` — logica di destinatari e deduplica notifiche
- `lib/push.ts` — invio Web Push

## 9. Note di prodotto
- l'app è pronta per un utilizzo reale in un contesto chiuso
- mantiene le regole di sicurezza principali: nessuno può registrarsi liberamente, master unico, RLS attivo
- la documentazione tecnica aggiornata deve considerare che la fase notifiche è completata
