'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { errorMessage } from '@/lib/errors'
import { SubmitButton } from '@/components/ui/submit-button'
import { Button } from '@/components/ui/button'
import { StatusBadge, StatusDot } from '@/components/ui/status-badge'
import { ErrorAlert, SuccessAlert } from '@/components/ui/alert'
import { UserSearchInput, type Profile } from '@/components/ui/user-search'
import {
  bookSelf,
  bookOtherUser,
  bookGuest,
  leaveBookingAsParticipant,
  cancelBooking,
} from '@/app/base/navette/actions'
import { formatFull, dayLabel } from '@/lib/date'
import { type ParticipantEntry, mapRawParticipants } from '@/components/navette/participants'

// ─── Tipi ────────────────────────────────────────────────────────────────────

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
}

// ─── Componente principale ────────────────────────────────────────────────────

type ActivePanel = null | 'user' | 'guest'

export function NavettaDetail({
  shuttle: initialShuttle,
  userId,
  initialBookings,
  error,
  ok,
  ammonizioniCount = 0,
}: {
  shuttle: ShuttleInfo
  userId: string
  initialBookings: BookingEntry[]
  error?: string
  ok?: string
  ammonizioniCount?: number
}) {
  const [shuttleInfo, setShuttleInfo] = useState(initialShuttle)
  const [bookings, setBookings] = useState(initialBookings)
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)

  // ── Stato derivato ────────────────────────────────────────────────────────

  /** Lista piatta di tutti i partecipanti su questa navetta */
  const flatParticipants = useMemo(() =>
    bookings.flatMap(b =>
      b.participants.map(p => ({ ...p, bookerId: b.booker_id, bookerUsername: b.bookerUsername }))
    ),
    [bookings],
  )

  /** Mie prenotazioni come booker */
  const myBookingsAsBooker = useMemo(
    () => bookings.filter(b => b.booker_id === userId),
    [bookings, userId],
  )

  /** Sono partecipante in una prenotazione di qualcun altro? */
  const otherBookingWithMe = bookings.find(
    b => b.booker_id !== userId && b.participants.some(p => !p.is_guest && p.user_id === userId)
  )
  const myParticipant = otherBookingWithMe?.participants.find(p => !p.is_guest && p.user_id === userId)
  const myParticipantInOtherBooking = otherBookingWithMe && myParticipant
    ? { ...myParticipant, bookerUsername: otherBookingWithMe.bookerUsername }
    : null

  /** Sono già presente come passeggero (in qualunque prenotazione)? */
  const isSelfParticipant = useMemo(
    () => flatParticipants.some(p => !p.is_guest && p.user_id === userId),
    [flatParticipants, userId],
  )

  /** ID utenti da escludere dalla ricerca (già presenti come booker o partecipante) */
  const excludedUserIds = useMemo(() => {
    const ids = new Set<string>()
    for (const b of bookings) {
      ids.add(b.booker_id)
      for (const p of b.participants) if (!p.is_guest && p.user_id) ids.add(p.user_id)
    }
    return ids
  }, [bookings])

  const canBook = !['full', 'done', 'cancelled'].includes(shuttleInfo.status)
  const canBookSelf = canBook && !isSelfParticipant
  const booked = shuttleInfo.max_seats - shuttleInfo.available_seats

  // ── Realtime ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel(`navetta-detail-${initialShuttle.id}`)
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
          const participants: ParticipantEntry[] = mapRawParticipants(parts)
          setBookings(prev => {
            // Evita duplicati: l'evento può arrivare dopo un redirect SSR che ha già incluso la prenotazione
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

  function closePanel() {
    setActivePanel(null)
    setSelectedUser(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Intestazione navetta */}
      <div className="flex items-center gap-3 mb-2">
        <StatusDot status={shuttleInfo.status} size="md" />
        <StatusBadge status={shuttleInfo.status} />
      </div>
      {(() => { const lbl = dayLabel(shuttleInfo.departure_time); return lbl ? (
        <span className="block font-mono text-[10px] uppercase tracking-widest mb-0.5"
          style={{ color: lbl === 'oggi' ? 'var(--red)' : 'var(--text-muted)' }}>{lbl}</span>
      ) : null })()}
      <h1 className="text-xl font-semibold mb-1">{formatFull(shuttleInfo.departure_time)}</h1>
      <p className="font-mono text-sm mb-8" style={{ color: 'var(--text-dim)' }}>
        {shuttleInfo.status === 'full'
          ? 'Posti esauriti'
          : `posti disponibili ${shuttleInfo.available_seats}`}
      </p>

      {shuttleInfo.status === 'draft' && (
        <p
          className="rounded-2xl border px-4 py-3 font-mono text-sm mb-6"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)', background: 'var(--bg-panel)' }}
        >
          Navetta in bozza — non ancora garantita. Verrà confermata al raggiungimento di{' '}
          {shuttleInfo.min_seats} prenotazioni.
        </p>
      )}

      {ok === '1' && <SuccessAlert message="Prenotazione confermata." />}
      {error && <ErrorAlert message={errorMessage(error)} />}

      {/* Lista piatta passeggeri */}
      {flatParticipants.length > 0 && (
        <div className="mb-8">
          <p
            className="font-mono text-[10px] uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-muted)' }}
          >
            Chi c&apos;è sulla navetta ({booked})
          </p>
          <div className="flex flex-col gap-1.5">
            {flatParticipants.map(p => (
              <div key={p.id} className="font-mono text-sm" style={{ color: 'var(--text)' }}>
                {p.is_guest ? (
                  <span style={{ color: 'var(--text-dim)' }}>Ospite: {p.guest_label}</span>
                ) : p.user_id === userId ? (
                  <>
                    {p.username ?? '—'}
                    <span className="ml-1.5" style={{ color: 'var(--text-dim)' }}>(tu)</span>
                  </>
                ) : (
                  p.username ?? '—'
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prenotato da qualcun altro → opzione per uscire */}
      {myParticipantInOtherBooking && (
        <div
          className="rounded-2xl border px-4 py-3 mb-6"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}
        >
          <p className="font-mono text-xs mb-3" style={{ color: 'var(--text-dim)' }}>
            Sei stato prenotato da{' '}
            <span style={{ color: 'var(--text)' }}>{myParticipantInOtherBooking.bookerUsername}</span>
          </p>
          {!['done', 'cancelled'].includes(shuttleInfo.status) && (
            <form action={leaveBookingAsParticipant}>
              <input type="hidden" name="shuttle_id" value={shuttleInfo.id} />
              <SubmitButton variant="danger" className="px-3 py-1.5">
                Rimuovimi
              </SubmitButton>
            </form>
          )}
        </div>
      )}

      {/* Mie prenotazioni come booker */}
      {myBookingsAsBooker.length > 0 && (
        <div className="mb-8">
          <p
            className="font-mono text-[10px] uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-muted)' }}
          >
            Le tue prenotazioni
          </p>
          <div className="flex flex-col gap-2">
            {myBookingsAsBooker.map(b => {
              const canCancel = !['done', 'cancelled'].includes(shuttleInfo.status)
              const participant = b.participants[0]
              const label = !participant
                ? '—'
                : participant.is_guest
                ? `Ospite: ${participant.guest_label}`
                : participant.user_id === userId
                ? `${participant.username ?? '—'} (tu)`
                : (participant.username ?? '—')

              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-2xl border px-4 py-3"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}
                >
                  <span className="font-mono text-sm" style={{ color: 'var(--text)' }}>
                    {label}
                  </span>
                  {canCancel && (
                    <form action={cancelBooking}>
                      <input type="hidden" name="booking_id" value={b.id} />
                      <input type="hidden" name="shuttle_id" value={shuttleInfo.id} />
                      <SubmitButton variant="danger" className="px-2.5 py-1">
                        Cancella
                      </SubmitButton>
                    </form>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Nuova prenotazione */}
      {canBook && (
        <div className="mb-8">
          <p
            className="font-mono text-[10px] uppercase tracking-widest mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Nuova prenotazione
          </p>
          {ammonizioniCount > 0 && (
            <p className="font-mono text-xs mb-3" style={{ color: 'var(--red)' }}>
              Attenzione: sei già stato ammonito {ammonizioniCount}{' '}
              {ammonizioniCount === 1 ? 'volta' : 'volte'}.
            </p>
          )}
          {ammonizioniCount === 0 && <div className="mb-3" />}

          {/* Selezione modalità */}
          {activePanel === null && (
            <div className="flex flex-wrap gap-2">
              {canBookSelf && (
                <form action={bookSelf}>
                  <input type="hidden" name="shuttle_id" value={shuttleInfo.id} />
                  <SubmitButton variant="primary" className="px-4 py-2">
                    Prenota per te
                  </SubmitButton>
                </form>
              )}
              <Button variant="outline" className="px-4 py-2" onClick={() => setActivePanel('user')}>
                Prenota un utente
              </Button>
              <Button variant="outline" className="px-4 py-2" onClick={() => setActivePanel('guest')}>
                Prenota un ospite
              </Button>
            </div>
          )}

          {/* Pannello: prenota utente registrato */}
          {activePanel === 'user' && (
            <div className="flex flex-col gap-3">
              <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                Seleziona un utente registrato da prenotare
              </p>
              <UserSearchInput
                excludedUserIds={excludedUserIds}
                currentUserId={userId}
                selectedUser={selectedUser}
                onSelect={setSelectedUser}
              />
              <div className="flex gap-2 mt-1">
                {selectedUser && (
                  <form action={bookOtherUser}>
                    <input type="hidden" name="shuttle_id" value={shuttleInfo.id} />
                    <input type="hidden" name="user_id" value={selectedUser.id} />
                    <SubmitButton variant="primary" className="px-4 py-2">
                      Conferma prenotazione
                    </SubmitButton>
                  </form>
                )}
                <Button variant="cancel" className="px-4 py-2" onClick={closePanel}>
                  Annulla
                </Button>
              </div>
            </div>
          )}

          {/* Pannello: prenota ospite */}
          {activePanel === 'guest' && (
            <form action={bookGuest} className="flex flex-col gap-3">
              <input type="hidden" name="shuttle_id" value={shuttleInfo.id} />
              <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                Nome dell&apos;ospite da prenotare
              </p>
              <div className="flex gap-2">
                <input
                  name="guest_name"
                  type="text"
                  placeholder="Mario Rossi"
                  autoFocus
                  className="flex-1 rounded-xl border px-4 py-2.5 font-mono text-sm outline-none"
                  style={{
                    background: 'var(--bg-panel)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                  }}
                />
              </div>
              <div className="flex gap-2">
                <SubmitButton variant="primary" className="px-4 py-2">
                  Prenota ospite
                </SubmitButton>
                <Button variant="cancel" className="px-4 py-2" onClick={closePanel}>
                  Annulla
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  )
}
