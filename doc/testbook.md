# Testbook — App Navette

Test funzionali da eseguire manualmente con un gruppo ristretto di utenti.  
Ogni test indica prerequisiti, passi e risultato atteso.

**Legenda stato:** `[ ]` da fare · `[x]` ok · `[!]` fallito

---

## Utenti necessari

Per eseguire tutti i test servono:
- **1 master** (account già esistente)
- **2 utenti base** (Utente A e Utente B — da creare prima di iniziare i test)

---

## Sezione 1 — Accesso e route

### T-AUTH-01 — Login con credenziali corrette (master)
**Prerequisiti:** nessuno  
**Passi:**
1. Vai su `/login`
2. Inserisci username e password del master
3. Premi "Accedi"

**Risultato atteso:** redirect a `/`, homepage con badge Master visibile, link Navette / Proposte / Utenti / Impostazioni.

---

### T-AUTH-02 — Login con credenziali corrette (utente base)
**Prerequisiti:** Utente A creato  
**Passi:**
1. Vai su `/login`
2. Inserisci username e password di Utente A
3. Premi "Accedi"

**Risultato atteso:** redirect a `/`, homepage senza badge Master, link Navette / Proposte / Impostazioni.

---

### T-AUTH-03 — Login con credenziali errate
**Prerequisiti:** nessuno  
**Passi:**
1. Vai su `/login`
2. Inserisci username corretto e password sbagliata
3. Premi "Accedi"

**Risultato atteso:** rimani su `/login`, messaggio di errore visibile, nessun redirect.

---

### T-AUTH-04 — Protezione route: accesso senza login
**Prerequisiti:** nessun utente loggato (usa finestra in incognito)  
**Passi:**
1. Vai direttamente su `/base/navette`

**Risultato atteso:** redirect a `/login`.

---

### T-AUTH-05 — Protezione route: utente base non accede a /master
**Prerequisiti:** loggato come Utente A  
**Passi:**
1. Vai direttamente su `/master/navette`

**Risultato atteso:** redirect a `/` (homepage base).

---

### T-AUTH-06 — Protezione route: master non accede a /base
**Prerequisiti:** loggato come master  
**Passi:**
1. Vai direttamente su `/base/navette`

**Risultato atteso:** redirect a `/master`.

---

### T-AUTH-07 — Logout
**Prerequisiti:** loggato come qualsiasi utente  
**Passi:**
1. Vai su Impostazioni
2. Premi "Esci dall'account"

**Risultato atteso:** redirect a `/login`, sessione terminata. Tornando su `/` si è reindirizzati a `/login`.

---

## Sezione 2 — Gestione utenti (master)

### T-USR-01 — Crea nuovo utente
**Prerequisiti:** loggato come master  
**Passi:**
1. Vai su `/master/utenti`
2. Premi "+ Nuovo"
3. Inserisci username (es. `utente_a`)
4. Premi "Crea utente"

**Risultato atteso:** pagina di conferma con credenziali (username + password). Il box credenziali ha un pulsante "Copia". Username e password sono selezionabili manualmente.

---

### T-USR-02 — Username duplicato
**Prerequisiti:** Utente A già creato  
**Passi:**
1. Vai su `/master/utenti/nuovo`
2. Inserisci lo stesso username di Utente A
3. Premi "Crea utente"

**Risultato atteso:** errore "Username già in uso", nessun utente creato.

---

### T-USR-03 — Visualizza lista utenti
**Prerequisiti:** almeno un utente base creato  
**Passi:**
1. Vai su `/master/utenti`

**Risultato atteso:** lista utenti base in ordine alfabetico. Il master non compare nella lista.

---

### T-USR-04 — Elimina utente
**Prerequisiti:** Utente B creato, non ha prenotazioni attive  
**Passi:**
1. Vai su `/master/utenti`
2. Seleziona Utente B
3. Premi "Elimina"

**Risultato atteso:** Utente B rimosso dalla lista. Non può più fare login.

---

## Sezione 3 — Navette (master)

### T-NAV-M-01 — Crea navetta in bozza (con soglia)
**Prerequisiti:** loggato come master  
**Passi:**
1. Vai su `/master/navette/nuova`
2. Scegli data e ora futura
3. Imposta posti totali = 10, soglia minima = 3
4. Premi "Crea navetta"

**Risultato atteso:** redirect a `/master/navette`, navetta visibile in stato **Bozza**.

---

### T-NAV-M-02 — Crea navetta confermata direttamente (soglia 0)
**Prerequisiti:** loggato come master  
**Passi:**
1. Vai su `/master/navette/nuova`
2. Scegli data e ora futura
3. Imposta posti totali = 8, lascia soglia minima vuota
4. Premi "Crea navetta"

**Risultato atteso:** navetta creata in stato **Confermata** (soglia 0 = confermata automaticamente).

---

### T-NAV-M-03 — Modifica orario navetta
**Prerequisiti:** navetta esistente non in `done`/`cancelled`  
**Passi:**
1. Entra nel dettaglio della navetta
2. Premi "Modifica orario"
3. Cambia data/ora
4. Premi "Salva"

**Risultato atteso:** orario aggiornato nella pagina, banner "Orario navetta aggiornato" visibile.

---

### T-NAV-M-04 — Modifica capacità navetta
**Prerequisiti:** navetta esistente con almeno 2 prenotazioni su 10 posti  
**Passi:**
1. Entra nel dettaglio
2. Premi "Modifica capacità"
3. Cambia posti totali a 15
4. Premi "Salva"

**Risultato atteso:** posti aggiornati. I posti occupati rimangono invariati, i disponibili aumentano.

---

### T-NAV-M-05 — Modifica capacità sotto i posti occupati
**Prerequisiti:** navetta con 5 prenotazioni  
**Passi:**
1. Premi "Modifica capacità"
2. Imposta posti totali = 3 (sotto i 5 occupati)
3. Premi "Salva"

**Risultato atteso:** errore "I posti massimi non possono essere inferiori ai posti già occupati", nessuna modifica.

---

### T-NAV-M-06 — Promozione manuale bozza → confermata
**Prerequisiti:** navetta in stato Bozza  
**Passi:**
1. Entra nel dettaglio della navetta in bozza
2. Premi "Conferma navetta"

**Risultato atteso:** stato diventa **Confermata**, il pulsante di conferma sparisce.

---

### T-NAV-M-07 — Segna navetta come effettuata
**Prerequisiti:** navetta in stato Confermata o Completa  
**Passi:**
1. Entra nel dettaglio
2. Premi "Segna effettuata"

**Risultato atteso:** stato diventa **Effettuata**. I pulsanti di modifica e cancellazione scompaiono.

---

### T-NAV-M-08 — Annulla navetta
**Prerequisiti:** navetta non in stato `done`  
**Passi:**
1. Entra nel dettaglio
2. Premi "Annulla navetta"

**Risultato atteso:** stato diventa **Annullata**. La navetta non è più visibile agli utenti base.

---

### T-NAV-M-09 — Prenotazione utente dal master
**Prerequisiti:** navetta confermata con posti disponibili, Utente A non prenotato  
**Passi:**
1. Entra nel dettaglio navetta (master)
2. Nel pannello prenotazioni, seleziona Utente A
3. Premi "Prenota"

**Risultato atteso:** Utente A appare nella lista prenotazioni. I posti disponibili diminuiscono di 1.

---

### T-NAV-M-10 — Prenotazione ospite dal master
**Prerequisiti:** navetta confermata con posti disponibili  
**Passi:**
1. Entra nel dettaglio navetta (master)
2. Seleziona il tab "Ospite"
3. Inserisci nome ospite (es. "Mario Rossi")
4. Premi "Prenota ospite"

**Risultato atteso:** "Mario Rossi (ospite)" appare nella lista prenotazioni.

---

### T-NAV-M-11 — Cancella prenotazione (dal master)
**Prerequisiti:** navetta con almeno una prenotazione  
**Passi:**
1. Entra nel dettaglio navetta (master)
2. Premi "Elimina" sulla prenotazione da cancellare

**Risultato atteso:** prenotazione rimossa, posti disponibili aumentano.

---

### T-NAV-M-12 — Cancella prenotazione ospite (verifica posti)
**Prerequisiti:** navetta con una prenotazione ospite  
**Passi:**
1. Nota il numero di posti disponibili (es. 7/10)
2. Cancella la prenotazione dell'ospite
3. Verifica i posti

**Risultato atteso:** i posti disponibili aumentano di 1 (es. 8/10). *(Questo test verifica il fix del bug ospiti.)*

---

## Sezione 4 — Navette (utente base)

### T-NAV-B-01 — Lista navette (non vede le cancellate)
**Prerequisiti:** loggato come Utente A. Esistono navette in vari stati.  
**Passi:**
1. Vai su `/base/navette`

**Risultato atteso:** navette in bozza, confermate e complete sono visibili. Le navette annullate NON compaiono.

---

### T-NAV-B-02 — Prenota per sé
**Prerequisiti:** navetta confermata con posti, Utente A non prenotato  
**Passi:**
1. Entra nel dettaglio navetta
2. Premi "Prenota per te"

**Risultato atteso:** banner di successo. Il proprio username compare nella lista passeggeri. I posti disponibili diminuiscono di 1.

---

### T-NAV-B-03 — Doppia prenotazione per sé (bloccata)
**Prerequisiti:** Utente A già prenotato sulla navetta  
**Passi:**
1. Entra nel dettaglio navetta
2. Il pulsante "Prenota per te" non è visibile

**Risultato atteso:** il pulsante "Prenota per te" è nascosto. Se si tenta via URL manipulation → errore "Sei già presente come passeggero".

---

### T-NAV-B-04 — Prenota un altro utente
**Prerequisiti:** navetta confermata, Utente A loggato, Utente B non prenotato  
**Passi:**
1. Entra nel dettaglio navetta come Utente A
2. Premi "Prenota un utente"
3. Cerca Utente B (almeno 2 caratteri)
4. Seleziona Utente B
5. Premi "Conferma prenotazione"

**Risultato atteso:** Utente B appare nella lista passeggeri. I posti disponibili diminuiscono di 1.

---

### T-NAV-B-05 — Prenota un ospite
**Prerequisiti:** navetta confermata con posti  
**Passi:**
1. Entra nel dettaglio navetta
2. Premi "Prenota un ospite"
3. Inserisci nome ospite
4. Premi "Prenota ospite"

**Risultato atteso:** "Ospite: [nome]" compare nella lista passeggeri.

---

### T-NAV-B-06 — Cancella propria prenotazione (sé stesso)
**Prerequisiti:** Utente A prenotato come booker per sé  
**Passi:**
1. Entra nel dettaglio navetta
2. Nella sezione "Le tue prenotazioni", premi "Cancella"

**Risultato atteso:** prenotazione rimossa, posti disponibili aumentano di 1.

---

### T-NAV-B-07 — Cancella prenotazione ospite (verifica posti)
**Prerequisiti:** Utente A ha prenotato un ospite  
**Passi:**
1. Nota posti disponibili
2. Cancella la prenotazione dell'ospite
3. Verifica posti

**Risultato atteso:** posti aumentano di 1. *(Verifica fix bug ospiti lato base.)*

---

### T-NAV-B-08 — Rimuoviti da prenotazione altrui
**Prerequisiti:** Utente A è stato prenotato da Utente B  
**Passi:**
1. Loggati come Utente A
2. Entra nel dettaglio della navetta
3. Vedi il box "Sei stato prenotato da [Utente B]"
4. Premi "Rimuovimi"

**Risultato atteso:** Utente A rimosso dai passeggeri, posti aumentano di 1.

---

### T-NAV-B-09 — Navetta bozza: messaggio soglia
**Prerequisiti:** navetta in stato Bozza con min_seats = 5  
**Passi:**
1. Utente A entra nel dettaglio navetta

**Risultato atteso:** avviso "Navetta in bozza — non ancora garantita. Verrà confermata al raggiungimento di 5 prenotazioni."

---

### T-NAV-B-10 — Prenotazione su navetta piena
**Prerequisiti:** navetta con 0 posti disponibili (stato Completa)  
**Passi:**
1. Entra nel dettaglio navetta

**Risultato atteso:** "Posti esauriti" visibile, nessun pulsante di prenotazione.

---

## Sezione 5 — Transizioni automatiche di stato

### T-STATO-01 — Bozza → Confermata automatica al raggiungimento soglia
**Prerequisiti:** navetta in Bozza con min_seats = 2  
**Passi:**
1. Utente A prenota sulla navetta (1ª prenotazione)
2. Verifica stato — rimane Bozza
3. Utente B prenota sulla stessa navetta (2ª prenotazione)
4. Aggiorna la pagina

**Risultato atteso:** dopo la 2ª prenotazione lo stato diventa **Confermata** automaticamente.

---

### T-STATO-02 — Confermata → Completa quando i posti sono esauriti
**Prerequisiti:** navetta confermata con 1 posto rimasto  
**Passi:**
1. Prenota l'ultimo posto disponibile

**Risultato atteso:** stato diventa **Completa**, "Posti esauriti" visibile.

---

### T-STATO-03 — Completa → Confermata quando si libera un posto
**Prerequisiti:** navetta in stato Completa (0 posti)  
**Passi:**
1. Cancella una prenotazione

**Risultato atteso:** stato torna a **Confermata**, i posti disponibili aumentano.

---

### T-STATO-04 — Navetta effettuata automaticamente quando passa l'orario
**Prerequisiti:** navetta con orario passato (es. ieri) in stato Confermata  
**Passi:**
1. Apri la pagina dettaglio della navetta

**Risultato atteso:** stato diventa **Effettuata** automaticamente al caricamento della pagina.

---

## Sezione 6 — Proposte (utente base)

### T-PROP-B-01 — Crea proposta
**Prerequisiti:** loggato come Utente A  
**Passi:**
1. Vai su `/base/proposte`
2. Premi "Nuova proposta"
3. Scegli data e ora, aggiungi eventuale nota
4. Premi "Invia proposta"

**Risultato atteso:** redirect a `/base/proposte`, proposta visibile in stato "In attesa".

---

### T-PROP-B-02 — Modifica proposta in attesa
**Prerequisiti:** Utente A ha una proposta in stato "In attesa"  
**Passi:**
1. Vai sul dettaglio della proposta
2. Cambia data/ora o note
3. Premi "Salva modifiche"

**Risultato atteso:** banner "Proposta aggiornata", dati aggiornati visibili.

---

### T-PROP-B-03 — Cancella proposta
**Prerequisiti:** Utente A ha una proposta in stato "In attesa"  
**Passi:**
1. Vai sul dettaglio della proposta
2. Premi "Cancella"

**Risultato atteso:** proposta rimossa dalla lista.

---

### T-PROP-B-04 — Proposta accettata non modificabile
**Prerequisiti:** la proposta di Utente A è stata accettata dal master  
**Passi:**
1. Vai sul dettaglio della proposta

**Risultato atteso:** il form di modifica e il pulsante "Cancella" NON sono visibili. È visibile solo lo stato "Accettata".

---

## Sezione 7 — Proposte (master)

### T-PROP-M-01 — Visualizza lista proposte
**Prerequisiti:** loggato come master, almeno una proposta in attesa  
**Passi:**
1. Vai su `/master/proposte`

**Risultato atteso:** lista proposte con username del proponente e data.

---

### T-PROP-M-02 — Accetta proposta e crea navetta
**Prerequisiti:** proposta in attesa  
**Passi:**
1. Entra nel dettaglio della proposta
2. Nella sezione "Accetta — crea navetta", imposta posti totali e soglia
3. Premi "Crea navetta"

**Risultato atteso:** navetta creata, proposta passa a stato "Accettata". Nel dettaglio della proposta compare il link "Vai alla navetta creata →".

---

### T-PROP-M-03 — Rifiuta proposta
**Prerequisiti:** proposta in attesa  
**Passi:**
1. Entra nel dettaglio della proposta
2. Premi "Rifiuta"

**Risultato atteso:** proposta passa a stato "Rifiutata". Il form scompare, rimane solo il riepilogo.

---

## Sezione 8 — Ricerca utenti e preferiti

### T-FAV-01 — Ricerca utente per prenota altri
**Prerequisiti:** Utente A loggato, Utente B esiste  
**Passi:**
1. Entra nel dettaglio di una navetta
2. Premi "Prenota un utente"
3. Digita almeno 2 caratteri del username di Utente B

**Risultato atteso:** Utente B appare nel dropdown entro ~300ms. L'utente corrente (Utente A) non compare mai nei risultati.

---

### T-FAV-02 — Aggiungi utente ai preferiti
**Prerequisiti:** nel pannello ricerca utenti  
**Passi:**
1. Cerca Utente B
2. Premi la stellina ☆ accanto al nome

**Risultato atteso:** stellina diventa ★ (rossa). Chiudi e riapri il pannello: Utente B appare nella sezione "Preferiti" in cima.

---

### T-FAV-03 — Rimuovi utente dai preferiti
**Prerequisiti:** Utente B nei preferiti  
**Passi:**
1. Apri il pannello ricerca
2. Nella sezione Preferiti, premi ★ accanto a Utente B

**Risultato atteso:** Utente B rimosso dai preferiti, la sezione Preferiti scompare se era l'unico.

---

### T-FAV-04 — Utente già prenotato non compare nei preferiti
**Prerequisiti:** Utente B già prenotato sulla navetta, è nei preferiti  
**Passi:**
1. Apri il pannello ricerca su quella navetta

**Risultato atteso:** Utente B NON compare nella lista preferiti (è già a bordo, sarebbe un duplicato).

---

## Sezione 9 — Realtime

### T-RT-01 — Aggiornamento passeggeri in tempo reale
**Prerequisiti:** due dispositivi/browser aperti sulla stessa pagina navetta  
**Passi:**
1. Dispositivo 1: pagina navetta aperta (Utente A)
2. Dispositivo 2: prenota Utente B su quella navetta

**Risultato atteso:** sul Dispositivo 1 Utente B appare nella lista passeggeri senza ricaricare la pagina.

---

### T-RT-02 — Aggiornamento posti in tempo reale
**Prerequisiti:** due browser aperti sulla stessa navetta  
**Passi:**
1. Browser 1: visualizza posti disponibili (es. 8/10)
2. Browser 2: effettua una prenotazione

**Risultato atteso:** Browser 1 mostra automaticamente 7/10 senza refresh.

---

### T-RT-03 — Aggiornamento stato navetta in tempo reale
**Prerequisiti:** navetta in Bozza con min_seats = 1, due browser aperti  
**Passi:**
1. Browser 1: pagina navetta aperta (base)
2. Browser 2 (master): prenota un utente → la navetta raggiunge la soglia

**Risultato atteso:** Browser 1 aggiorna lo stato a Confermata senza refresh.

---

## Sezione 10 — Notifiche push

> Prima di testare le notifiche: attiva le notifiche push nelle impostazioni di ogni utente e assicurati che il browser abbia dato il permesso.

### T-PUSH-01 — Attivazione notifiche push
**Prerequisiti:** utente loggato, prima volta  
**Passi:**
1. Vai su Impostazioni
2. Accanto a "Notifiche push" premi il toggle

**Risultato atteso:** il browser mostra la richiesta di permesso. Dopo conferma, il toggle mostra "Attive".

---

### T-PUSH-02 — U1: nuova proposta
**Prerequisiti:** Utente A e Utente B hanno notifiche push attive con U1 abilitato  
**Passi:**
1. Utente A crea una nuova proposta

**Risultato atteso:**
- Il **master** riceve notifica M1 "Nuova proposta"
- **Utente B** riceve notifica U1 "Nuova proposta navetta"
- **Utente A** (autore) NON riceve U1

---

### T-PUSH-03 — U2: nuova navetta in bozza
**Prerequisiti:** Utente A ha U2 attivo  
**Passi:**
1. Master crea navetta con soglia > 0 (bozza)

**Risultato atteso:** Utente A riceve notifica "Nuova navetta disponibile (non ancora confermata)".

---

### T-PUSH-04 — U3: nuova navetta confermata
**Prerequisiti:** Utente A ha U3 attivo  
**Passi:**
1. Master crea navetta senza soglia (confermata direttamente)

**Risultato atteso:** Utente A riceve notifica "Nuova navetta confermata".

---

### T-PUSH-05 — U4/U5: cambio stato navetta
**Prerequisiti:** Utente A ha U4 attivo (tutte le navette); Utente B ha solo U5 attivo (solo prenotate) ed è prenotato sulla navetta  
**Passi:**
1. Master promuove navetta da bozza a confermata

**Risultato atteso:**
- Utente A riceve notifica "Navetta confermata" (via U4)
- Utente B riceve notifica "Navetta confermata" (via U5, è prenotato)
- Chi ha sia U4 che U5 riceve **una sola** notifica (nessun duplicato)

---

### T-PUSH-06 — U6/U7: aggiornamento posti senza cambio stato
**Prerequisiti:** navetta confermata. Utente A ha U6 attivo; Utente B ha solo U7 ed è prenotato  
**Passi:**
1. Utente A prenota sulla navetta (senza che cambi stato)

**Risultato atteso:**
- Utente B riceve notifica posti aggiornati (via U7)
- Chi ha U6 riceve la notifica; chi ha solo U7 e non è prenotato non riceve nulla

---

### T-PUSH-07 — U8/U9: navetta annullata
**Prerequisiti:** Utente A ha U8 (tutte); Utente B ha solo U9 (personale) ed è prenotato  
**Passi:**
1. Master annulla la navetta

**Risultato atteso:**
- Utente A riceve notifica "Navetta annullata" (via U8)
- Utente B riceve "Navetta annullata — la tua prenotazione è stata rimossa" (via U9, messaggio personalizzato)
- Nessun duplicato per chi ha entrambi

---

### T-PUSH-08 — U10: sei stato aggiunto da qualcun altro
**Prerequisiti:** Utente B ha U10 attivo  
**Passi:**
1. Utente A prenota Utente B sulla navetta (via "Prenota un utente")

**Risultato atteso:** Utente B riceve notifica "Sei stato prenotato sulla navetta". Utente A NON riceve questa notifica.

---

### T-PUSH-09 — U10: sei stato rimosso da qualcun altro
**Prerequisiti:** Utente B è prenotato da Utente A. Utente B ha U10 attivo.  
**Passi:**
1. Utente A cancella la propria prenotazione (che includeva Utente B)

**Risultato atteso:** Utente B riceve notifica "Sei stato rimosso dalla navetta".

---

### T-PUSH-10 — U11/U12: orario navetta modificato
**Prerequisiti:** Utente A ha U11 (tutte le navette); Utente B ha solo U12 ed è prenotato  
**Passi:**
1. Master modifica l'orario della navetta

**Risultato atteso:**
- Utente A riceve "Orario navetta aggiornato" (via U11)
- Utente B riceve "Orario navetta aggiornato" (via U12, è prenotato)
- Nessun duplicato per chi ha entrambi

---

### T-PUSH-11 — M2: notifica master nuova prenotazione
**Prerequisiti:** master ha M2 attivo  
**Passi:**
1. Utente A prenota su una navetta

**Risultato atteso:** master riceve notifica "Nuova prenotazione".

---

### T-PUSH-12 — M4: notifica master prenotazione cancellata
**Prerequisiti:** master ha M4 attivo  
**Passi:**
1. Utente A cancella la propria prenotazione

**Risultato atteso:** master riceve notifica "Prenotazione cancellata".

---

### T-PUSH-13 — M5: navetta confermata automaticamente
**Prerequisiti:** navetta bozza con min_seats = 2. Master ha M5 attivo.  
**Passi:**
1. Aggiungi la 2ª prenotazione (raggiunge la soglia)

**Risultato atteso:** master riceve "Navetta confermata automaticamente".

---

### T-PUSH-14 — M6: navetta tornata in bozza
**Prerequisiti:** navetta confermata con min_seats = 2 e esattamente 2 prenotazioni. Master ha M6 attivo.  
**Passi:**
1. Cancella una delle 2 prenotazioni

**Risultato atteso:** master riceve "Navetta tornata in bozza — passeggeri insufficienti".

---

### T-PUSH-15 — Preferenza disabilitata: nessuna notifica
**Prerequisiti:** Utente A, disabilita U4 nelle impostazioni  
**Passi:**
1. Master cambia lo stato di una navetta

**Risultato atteso:** Utente A NON riceve nessuna notifica per quel cambio di stato.

---

## Sezione 11 — Impostazioni

### T-IMP-01 — Toggle preferenza notifica (base)
**Prerequisiti:** loggato come Utente A  
**Passi:**
1. Vai su `/base/impostazioni`
2. Disabilita una preferenza (es. U2)
3. Ricarica la pagina

**Risultato atteso:** la preferenza rimane disabilitata dopo il reload (persistita nel DB).

---

### T-IMP-02 — Toggle preferenza notifica (master)
**Prerequisiti:** loggato come master  
**Passi:**
1. Vai su `/master/impostazioni`
2. Disabilita M1
3. Ricarica la pagina

**Risultato atteso:** M1 rimane disabilitata.

---

## Sezione 12 — Edge case e robustezza

### T-EDGE-01 — Prenotazione su navetta in bozza (consentita)
**Prerequisiti:** navetta in Bozza con posti  
**Passi:**
1. Utente A prenota sulla navetta in bozza

**Risultato atteso:** prenotazione accettata. L'utente sa che la navetta non è garantita.

---

### T-EDGE-02 — Prenotazione su navetta annullata (bloccata)
**Prerequisiti:** navetta annullata  
**Passi:**
1. Utente A accede al dettaglio (es. via URL diretto)

**Risultato atteso:** redirect a `/base/navette` (la navetta non è visibile nella lista).

---

### T-EDGE-03 — Stesso utente non prenotabile due volte
**Prerequisiti:** Utente B già prenotato da Utente A  
**Passi:**
1. Utente A prova a prenotare Utente B di nuovo (via "Prenota un utente")

**Risultato atteso:** Utente B non compare nei risultati di ricerca (già escluso). Se tentato via form manipulation → errore "Questo utente è già presente su questa navetta."

---

### T-EDGE-04 — Master non prenotabile come partecipante
**Prerequisiti:** navetta confermata  
**Passi:**
1. Utente A tenta di prenotare il master (se compare nei risultati)

**Risultato atteso:** il master non appare mai nei risultati di ricerca.

---

### T-EDGE-05 — Crea navetta con data passata
**Prerequisiti:** loggato come master  
**Passi:**
1. Vai su `/master/navette/nuova`
2. Scegli data nel passato
3. Premi "Crea navetta"

**Risultato atteso:** la navetta viene creata ma al primo accesso alla pagina risulta già in stato **Effettuata** (mark expired automatico). *(Comportamento accettabile — da verificare che non causi errori.)*

---

### T-EDGE-06 — Logout e tentativo di riuso sessione
**Prerequisiti:** utente appena fatto logout  
**Passi:**
1. Premi il tasto indietro del browser
2. Tenta di navigare a una route protetta

**Risultato atteso:** redirect a `/login`, sessione non riutilizzabile.

---

## Note per il tester

- Le notifiche push richiedono HTTPS (o localhost). Su preview Vercel funzionano regolarmente.
- Per testare i realtime (Sezione 9) usa due browser diversi o una finestra normale + una in incognito.
- Il numero di badge in homepage per Navette e Proposte si aggiorna in tempo reale (senza refresh) se la pagina è aperta.
- Dopo ogni test che modifica dati, verifica che il contatore posti sia coerente con le prenotazioni visibili.
