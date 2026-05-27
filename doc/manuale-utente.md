# Manuale utente — App Navette

## 1. Introduzione
Questa app serve a gestire navette e prenotazioni per un gruppo chiuso. Esistono due tipi di utenti:
- **master**: gestisce navette, utenti e proposte
- **base**: prenota navette e propone nuove corse

## 2. Accesso all'app
### Login
- Vai a `/login`
- Inserisci `username` e `password`
- L'email non viene richiesta direttamente: è gestita internamente come `username@navette.internal`

Se non hai username/password, chiedile al master.

## 3. Pagina principale
- Se sei master, vieni reindirizzato alla dashboard master
- Se sei utente base, vieni reindirizzato alla lista navette

## 4. Utente base — cosa puoi fare
### Vedere le navette disponibili
- Vai su `/base/navette`
- Vedi navette in stato `bozza`, `confermata` e `completa`
- Le navette in bozza hanno un avviso che le definisce non ancora garantite

### Prenotare una navetta
1. Apri la navetta desiderata
2. Scegli una modalità di prenotazione:
   - `Prenota per sé`
   - `Prenota un altro utente registrato`
   - `Prenota un ospite esterno`
3. Compila i campi richiesti e invia

### Regole di prenotazione
- non puoi prenotare la stessa persona due volte sulla stessa navetta
- non puoi prenotare un master come partecipante
- non puoi prenotare se la navetta è già `full`

### Gestire le tue prenotazioni
- Vai su `/base/prenotazioni`
- Vedi le prenotazioni attive e lo storico
- Puoi cancellare una prenotazione creata da te
- Se sei stato aggiunto come partecipante a una prenotazione altrui, puoi lasciare quella prenotazione

### Proporre una navetta
- Vai su `/base/proposte/nuova`
- Inserisci data/ora e note opzionali
- Invia la proposta al master
- Segui lo stato della proposta in `/base/proposte`

### Impostazioni e notifiche
- Vai su `/base/impostazioni`
- Attiva/disattiva il servizio push sul dispositivo corrente
- Personalizza le notifiche che vuoi ricevere
- Quando disattivi le notifiche, l'app toglie la subscription dal browser

### Esci
- Usa il pulsante `Esci dall'account` in `/base/impostazioni`

## 5. Master — cosa puoi fare
### Creare una navetta
- Vai su `/master/navette/nuova`
- Inserisci data/ora, numero massimo di posti e soglia minima opzionale
- Se imposti `min_seats = 0`, la navetta è immediatamente confermata
- Se lasci `min_seats > 0`, la navetta resta in bozza finché non raggiunge la soglia

### Gestire navette
- Vai su `/master/navette`
- Seleziona una navetta per vedere il dettaglio
- Azioni disponibili:
  - confermare una navetta in bozza
  - segnare una navetta come effettuata
  - annullare una navetta
  - aggiornare posti o orario

### Vedere le prenotazioni
- Nel dettaglio navetta master, vedi tutte le prenotazioni
- Vedi chi ha prenotato e chi sono i partecipanti
- Puoi prenotare utenti base o ospiti esterni anche come master
- Puoi cancellare prenotazioni se necessario

### Gestire proposte
- Vai su `/master/proposte`
- Valuta le proposte `pending`
- Puoi accettare una proposta creando direttamente una navetta in bozza
- Puoi rifiutare una proposta senza creare nulla

### Gestire utenti
- Vai su `/master/utenti`
- Crea nuovi utenti base inserendo solo lo username
- La password viene generata automaticamente e viene mostrata una sola volta
- Rimuovi utenti base quando non servono più
- Puoi resettare la password di un utente se necessario

### Impostazioni notifiche
- Vai su `/master/impostazioni`
- Attiva/disattiva il servizio push sul dispositivo corrente
- Personalizza quali eventi vuoi ricevere
- Anche il master ha toggle per notifiche di proposte e prenotazioni

### Note sulla sicurezza
- Il master è un utente unico: non può essere eliminato via interfaccia
- Gli utenti base non possono iscriversi da soli
- Tutte le azioni critiche sono protette lato server

## 6. Glossario dei termini
- **Navetta**: corsa da prenotare
- **Bozza**: navetta non ancora garantita, ma prenotabile
- **Confermata**: navetta garantita
- **Completa**: posti esauriti
- **Proposta**: richiesta di navetta inviata dall'utente base
- **Booking**: prenotazione creata da un utente
- **Partecipante**: utente registrato o ospite incluso nella prenotazione

## 7. Cosa succede dopo la prenotazione
- Se la navetta è in bozza, può diventare confermata automaticamente al raggiungimento della soglia minima
- Se i posti finiscono, lo stato diventa `full`
- Se viene cancellata, tutte le prenotazioni vengono annullate

## 8. Comportamento delle notifiche
- La notifica viene inviata solo se hai attivato il servizio push
- Puoi ricevere notifiche per proposte, navette nuove, cambi di stato e cancellazioni
- Puoi disattivare le notifiche browser in qualsiasi momento

## 9. Stato reale dell'app
- L'app è pronta per l'uso reale in un gruppo chiuso
- Le funzionalità principali sono già presenti e funzionanti
- Le notifiche push sono configurate e funzionanti se sono state inserite le chiavi VAPID e l'utente ha attivato la subscription
