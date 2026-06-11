// Messaggi utente per i codici errore passati via query string (?error=...).
// Testi generici qui; le pagine possono passare override per messaggi contestuali.

const ERROR_MESSAGES: Record<string, string> = {
  // Prenotazioni
  'posti-insufficienti':          'Posti insufficienti per questa prenotazione.',
  'navetta-non-prenotabile':      'Questa navetta non è più prenotabile.',
  'prenotazione-esistente':       'Sei già presente come passeggero su questa navetta.',
  'partecipante-già-prenotato':   'Questo utente è già presente su questa navetta.',
  'partecipante-non-valido':      'Non è possibile prenotare per questo utente.',
  'nome-ospite-mancante':         'Inserisci il nome dell\'ospite.',
  'errore-prenotazione':          'Errore durante la prenotazione. Riprova.',
  'utente-mancante':              'Seleziona un utente.',
  'non-trovato':                  'Prenotazione non trovata.',

  // Navette
  'posti-occupati':               'I posti massimi non possono essere inferiori ai posti già occupati.',
  'navetta-non-modificabile':     'Questa navetta non può essere modificata.',
  'orario-non-valido':            'Data e ora non valide.',

  // Proposte
  'proposta-non-trovata':         'Proposta non trovata o già gestita.',
  'non-modificabile':             'Questa proposta non può più essere modificata.',

  // Utenti
  'username-non-valido':          'Username non valido. Usa solo lettere minuscole, numeri e underscore (2–30 caratteri).',
  'username-esistente':           'Username già in uso.',
  'errore-reset':                 'Errore durante il reset della password. Riprova.',
  'errore-eliminazione':          'Errore durante l\'eliminazione. Riprova.',
  'nota-vuota':                   'La nota non può essere vuota.',

  // Generici
  'dati-non-validi':              'Controlla i dati inseriti.',
  'errore-creazione':             'Errore durante la creazione. Riprova.',
  'errore-salvataggio':           'Errore durante il salvataggio. Riprova.',
  'non-autorizzato':              'Operazione non autorizzata.',
}

export function errorMessage(code: string, overrides?: Record<string, string>): string {
  return overrides?.[code] ?? ERROR_MESSAGES[code] ?? 'Errore sconosciuto.'
}
