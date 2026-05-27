'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { SubmitButton } from '@/components/ui/submit-button'
import { StatusDot, STATUS_LABEL } from '@/components/ui/status-badge'
import { DetailRow } from '@/components/ui/detail-row'
import { ErrorAlert, SuccessAlert } from '@/components/ui/alert'
import { MasterBookingPanel } from '@/components/navette/master-booking-panel'
import {
  confirmShuttle,
  markShuttleDone,
  cancelShuttle,
  masterCancelBooking,
} from '@/app/master/navette/actions'
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
          setShuttleInfo(prev => ({ ...prev, available_seats: u.available_seats, status: u.status }))
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

  const canConfirm = shuttleInfo.status === 'draft'
  const canMarkDone = shuttleInfo.status === 'confirmed' || shuttleInfo.status === 'full'
  const canCancel = shuttleInfo.status !== 'done' && shuttleInfo.status !== 'cancelled'
  const canBook = shuttleInfo.status !== 'done' && shuttleInfo.status !== 'cancelled' && shuttleInfo.status !== 'full'

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
          <DetailRow label="Partenza" value={formatFull(shuttleInfo.departure_time)} />
          <DetailRow label="Posti disponibili" value={`${shuttleInfo.available_seats} / ${shuttleInfo.max_seats}`} />
          <DetailRow label="Soglia conferma" value={`${shuttleInfo.min_seats} prenotazioni`} />
          <DetailRow label="Creata il" value={formatMediumTime(shuttleInfo.created_at)} />
        </div>
      </div>

      {/* Messaggi ok/error */}
      {ok === 'prenotazione' && <SuccessAlert message="Prenotazione aggiunta." />}
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
      {(canConfirm || canMarkDone || canCancel) && (
        <div className="flex flex-wrap gap-3">
          {canConfirm && (
            <form action={confirmShuttle}>
              <input type="hidden" name="id" value={shuttleInfo.id} />
              <SubmitButton
                className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors"
                style={{ background: '#22c55e', borderColor: '#22c55e', color: 'white' }}
              >
                Conferma
              </SubmitButton>
            </form>
          )}
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
