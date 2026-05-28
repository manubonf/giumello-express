'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { SubmitButton } from '@/components/ui/submit-button'
import { StatusDot, STATUS_LABEL } from '@/components/ui/status-badge'
import { DetailRow } from '@/components/ui/detail-row'
import { ErrorAlert, SuccessAlert } from '@/components/ui/alert'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { MasterBookingPanel } from '@/components/navette/master-booking-panel'
import {
  markShuttleDone,
  cancelShuttle,
  masterCancelBooking,
  updateShuttleCapacity,
  updateShuttleDepartureTime,
} from '@/app/master/navette/actions'
import { Button } from '@/components/ui/button'
import { formatFull, formatMediumTime } from '@/lib/date'

// ─── Tipi ────────────────────────────────────────────────────────────────────

type ParticipantEntry = {
  id: string
  is_guest: boolean
  guest_label: string | null
  user_id: string | null
  username: string | null
}

type BookingEntry = {
  id: string
  booker_id: string
  bookerUsername: string
  participants: ParticipantEntry[]
}

type ShuttleInfo = {
  id: string
  status: string
  departure_time: string
  max_seats: number
  available_seats: number
  min_seats: number
  created_at: string
}

// ─── Messaggi di errore ───────────────────────────────────────────────────────

const MASTER_ERROR_MSG: Record<string, string> = {
  'partecipante-non-valido':    'Non è possibile prenotare per un utente master.',
  'partecipante-già-prenotato': 'Questo utente è già presente su questa navetta.',
  'posti-insufficienti':        'Posti insufficienti.',
  'nome-ospite-mancante':       'Inserisci il nome dell\'ospite.',
  'errore-prenotazione':        'Errore durante la prenotazione. Riprova.',
  'utente-mancante':            'Seleziona un utente.',
  'non-trovato':                'Prenotazione non trovata.',
  'posti-occupati':             'I posti massimi non possono essere inferiori ai posti già occupati.',
  'navetta-non-modificabile':   'Questa navetta non può essere modificata.',
  'dati-non-validi':            'Dati non validi.',
  'orario-non-valido':          'Data e ora non valide.',
}

// ─── Componente principale ────────────────────────────────────────────────────

export function MasterNavettaDetail({
  shuttle: initialShuttle,
  initialBookings,
  error,
  ok,
}: {
  shuttle: ShuttleInfo
  initialBookings: BookingEntry[]
  error?: string
  ok?: string
}) {
  const [shuttleInfo, setShuttleInfo] = useState(initialShuttle)
  const [bookings, setBookings] = useState(initialBookings)
  const [isEditingCapacity, setIsEditingCapacity] = useState(false)
  const [isEditingDeparture, setIsEditingDeparture] = useState(false)

  // ── Realtime ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const channel = supabase
      .channel(`master-navetta-${initialShuttle.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'shuttles', filter: `id=eq.${initialShuttle.id}` },
        (payload) => {
          const u = payload.new as ShuttleInfo
          setShuttleInfo(prev => ({
            ...prev,
            status: u.status,
            departure_time: u.departure_time,
            available_seats: u.available_seats,
            max_seats: u.max_seats,
            min_seats: u.min_seats,
          }))
          setIsEditingCapacity(false)
          setIsEditingDeparture(false)
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings', filter: `shuttle_id=eq.${initialShuttle.id}` },
        async (payload) => {
          const nb = payload.new as { id: string; booker_id: string }
          const { data: bookerProfile } = await supabase
            .from('profiles').select('username').eq('id', nb.booker_id).single()
          const { data: parts } = await supabase
            .from('booking_participants')
            .select('id, is_guest, guest_label, user_id, profiles(username)')
            .eq('booking_id', nb.id)
          const participants: ParticipantEntry[] = (parts ?? []).map((p: any) => ({
            id: p.id,
            is_guest: p.is_guest,
            guest_label: p.guest_label,
            user_id: p.user_id ?? null,
            username: p.is_guest ? null : (p.profiles?.username ?? null),
          }))
          setBookings(prev => {
            if (prev.some(b => b.id === nb.id)) return prev
            return [
              ...prev,
              { id: nb.id, booker_id: nb.booker_id, bookerUsername: bookerProfile?.username ?? '—', participants },
            ]
          })
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'bookings' },
        (payload) => {
          const deleted = payload.old as { id: string }
          setBookings(prev => prev.filter(b => b.id !== deleted.id))
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [initialShuttle.id])

  // ── Stato derivato ─────────────────────────────────────────────────────────

  const canMarkDone = shuttleInfo.status === 'confirmed' || shuttleInfo.status === 'full'
  const canCancel = shuttleInfo.status !== 'done' && shuttleInfo.status !== 'cancelled'
  const canBook = shuttleInfo.status !== 'done' && shuttleInfo.status !== 'cancelled' && shuttleInfo.status !== 'full'
  const canEditCapacity = shuttleInfo.status !== 'done' && shuttleInfo.status !== 'cancelled'
  const canEditDeparture = shuttleInfo.status !== 'done' && shuttleInfo.status !== 'cancelled'

  const booked = shuttleInfo.max_seats - shuttleInfo.available_seats

  const excludedUserIds = useMemo(() => {
    const ids: string[] = []
    for (const b of bookings) {
      ids.push(b.booker_id)
      for (const p of b.participants) if (!p.is_guest && p.user_id) ids.push(p.user_id)
    }
    return ids
  }, [bookings])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Stato navetta */}
      <div className="flex items-center gap-3 mb-8">
        <StatusDot status={shuttleInfo.status} size="md" />
        <h1 className="text-xl font-semibold">
          {STATUS_LABEL[shuttleInfo.status] ?? shuttleInfo.status}
        </h1>
      </div>

      {/* Dettagli */}
      <div className="rounded-sm border mb-8" style={{ borderColor: 'var(--border)' }}>
        <div className="px-4">
          {/* Riga partenza — statica o form modifica */}
          {isEditingDeparture ? (
            <form action={updateShuttleDepartureTime}>
              <input type="hidden" name="shuttle_id" value={shuttleInfo.id} />
              <div className="py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <p
                  className="font-mono text-xs uppercase tracking-wide mb-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Data e ora partenza
                </p>
                <DateTimePicker
                  name="departure_time"
                  required
                  defaultValue={shuttleInfo.departure_time}
                />
              </div>
              <div className="flex gap-2 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <SubmitButton
                  className="rounded-sm border px-3 py-1.5 font-mono text-xs uppercase tracking-wide"
                  style={{ background: '#22c55e', borderColor: '#22c55e', color: 'white' }}
                >
                  Salva
                </SubmitButton>
                <Button
                  type="button"
                  onClick={() => setIsEditingDeparture(false)}
                  className="rounded-sm border px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors hover:border-[--red] hover:text-[--red]"
                  style={{ background: 'none', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
                >
                  Annulla
                </Button>
              </div>
            </form>
          ) : (
            <DetailRow label="Partenza" value={formatFull(shuttleInfo.departure_time)} />
          )}

          {isEditingCapacity ? (
            <form action={updateShuttleCapacity}>
              <input type="hidden" name="shuttle_id" value={shuttleInfo.id} />

              {/* Posti massimi */}
              <div
                className="flex items-center justify-between py-3"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <label
                  htmlFor="edit-max-seats"
                  className="font-mono text-xs uppercase tracking-wide"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Posti massimi
                </label>
                <input
                  id="edit-max-seats"
                  name="max_seats"
                  type="number"
                  min={booked}
                  defaultValue={shuttleInfo.max_seats}
                  required
                  className="w-20 rounded-sm border px-2 py-1 font-mono text-sm text-right outline-none"
                  style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>

              {/* Soglia conferma */}
              <div
                className="flex items-center justify-between py-3"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <label
                  htmlFor="edit-min-seats"
                  className="font-mono text-xs uppercase tracking-wide"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Soglia conferma
                </label>
                <input
                  id="edit-min-seats"
                  name="min_seats"
                  type="number"
                  min={0}
                  defaultValue={shuttleInfo.min_seats}
                  required
                  className="w-20 rounded-sm border px-2 py-1 font-mono text-sm text-right outline-none"
                  style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>

              {booked > 0 && (
                <p className="font-mono text-[10px] pt-2 pb-1" style={{ color: 'var(--text-dim)' }}>
                  Posti già occupati: {booked} — i posti massimi non possono essere inferiori a questo valore.
                </p>
              )}

              <div className="flex gap-2 py-3">
                <SubmitButton
                  className="rounded-sm border px-3 py-1.5 font-mono text-xs uppercase tracking-wide"
                  style={{ background: '#22c55e', borderColor: '#22c55e', color: 'white' }}
                >
                  Salva
                </SubmitButton>
                <Button
                  type="button"
                  onClick={() => setIsEditingCapacity(false)}
                  className="rounded-sm border px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors hover:border-[--red] hover:text-[--red]"
                  style={{ background: 'none', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
                >
                  Annulla
                </Button>
              </div>
            </form>
          ) : (
            <>
              <DetailRow label="Posti disponibili" value={`${shuttleInfo.available_seats} / ${shuttleInfo.max_seats}`} />
              <DetailRow label="Soglia conferma" value={`${shuttleInfo.min_seats} prenotazioni`} />
            </>
          )}

          <DetailRow label="Creata il" value={formatMediumTime(shuttleInfo.created_at)} />
        </div>

        {(canEditDeparture || canEditCapacity) && !isEditingDeparture && !isEditingCapacity && (
          <div className="px-4 pb-4 pt-1 flex gap-2">
            {canEditDeparture && (
              <button
                type="button"
                onClick={() => setIsEditingDeparture(true)}
                className="rounded-sm border px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors hover:opacity-80"
                style={{ background: 'none', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                Modifica orario
              </button>
            )}
            {canEditCapacity && (
              <button
                type="button"
                onClick={() => setIsEditingCapacity(true)}
                className="rounded-sm border px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors hover:opacity-80"
                style={{ background: 'none', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                Modifica capacità
              </button>
            )}
          </div>
        )}
      </div>

      {/* Messaggi ok/error */}
      {ok === 'prenotazione' && <SuccessAlert message="Prenotazione aggiunta." />}
      {ok === 'capacita-aggiornata' && <SuccessAlert message="Capacità navetta aggiornata." />}
      {ok === 'orario-aggiornato' && <SuccessAlert message="Orario navetta aggiornato." />}
      {error && <ErrorAlert message={MASTER_ERROR_MSG[error] ?? 'Errore sconosciuto.'} />}

      {/* Lista prenotazioni con struttura booker → partecipanti */}
      <div className="mb-8">
        <p
          className="font-mono text-[10px] uppercase tracking-widest mb-3"
          style={{ color: 'var(--text-muted)' }}
        >
          Prenotazioni ({booked} / {shuttleInfo.max_seats})
        </p>
        {!bookings.length ? (
          <p className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
            Nessuna prenotazione.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {bookings.map((b, i) => (
              <div
                key={b.id}
                className="rounded-sm border px-4 py-3"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}
              >
                {/* Riga booker + numero + pulsante elimina */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono text-[10px] w-4 text-right flex-shrink-0"
                      style={{ color: 'var(--text-dim)' }}
                    >
                      {i + 1}.
                    </span>
                    <span className="font-mono text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                      da{' '}
                      <span style={{ color: 'var(--text)' }}>{b.bookerUsername}</span>
                    </span>
                  </div>
                  {canCancel && (
                    <form action={masterCancelBooking}>
                      <input type="hidden" name="booking_id" value={b.id} />
                      <input type="hidden" name="shuttle_id" value={shuttleInfo.id} />
                      <SubmitButton
                        className="rounded-sm border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors hover:border-[--red] hover:text-[--red]"
                        style={{ background: 'none', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
                      >
                        Elimina
                      </SubmitButton>
                    </form>
                  )}
                </div>

                {/* Partecipanti */}
                {b.participants.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pl-6">
                    {b.participants.map(p => (
                      <span
                        key={p.id}
                        className="font-mono text-xs rounded-sm border px-1.5 py-0.5"
                        style={{ borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
                      >
                        {p.is_guest ? `${p.guest_label} (ospite)` : (p.username ?? '—')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pannello booking master */}
      {canBook && (
        <div className="mb-8">
          <MasterBookingPanel
            shuttleId={shuttleInfo.id}
            excludedUserIds={excludedUserIds}
          />
        </div>
      )}

      {/* Azioni stato navetta */}
      {(canMarkDone || canCancel) && (
        <div className="flex flex-wrap gap-3">
          {canMarkDone && (
            <form action={markShuttleDone}>
              <input type="hidden" name="id" value={shuttleInfo.id} />
              <SubmitButton
                className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors"
                style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
              >
                Segna effettuata
              </SubmitButton>
            </form>
          )}
          {canCancel && (
            <form action={cancelShuttle}>
              <input type="hidden" name="id" value={shuttleInfo.id} />
              <SubmitButton
                className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors hover:border-[--red] hover:text-[--red]"
                style={{ background: 'none', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
              >
                Annulla navetta
              </SubmitButton>
            </form>
          )}
        </div>
      )}
    </>
  )
}
