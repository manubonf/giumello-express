'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { SubmitButton } from '@/components/ui/submit-button'
import { Button } from '@/components/ui/button'
import { StatusBadge, StatusDot } from '@/components/ui/status-badge'
import { ErrorAlert, SuccessAlert } from '@/components/ui/alert'
import { createBooking, cancelBooking, updateBooking } from '@/app/base/navette/actions'
import { formatFull } from '@/lib/date'

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
}

type OtherProfile = { id: string; username: string }

const ERROR_MSG: Record<string, string> = {
  'posti-insufficienti':           'Posti insufficienti per il numero di partecipanti selezionati.',
  'navetta-non-prenotabile':       'Questa navetta non è più prenotabile.',
  'prenotazione-esistente':        'Hai già una prenotazione per questa navetta.',
  'partecipante-già-prenotato':    'Uno o più partecipanti selezionati hanno già una prenotazione per questa navetta.',
  'errore-prenotazione':           'Errore durante la prenotazione. Riprova.',
  'non-autorizzato':               'Operazione non autorizzata.',
}

export function NavettaDetail({
  shuttle: initialShuttle,
  myBookingId,
  userId,
  username,
  initialBookings,
  allOtherProfiles,
  error,
  ok,
}: {
  shuttle: ShuttleInfo
  myBookingId: string | null
  userId: string
  username: string
  initialBookings: BookingEntry[]
  allOtherProfiles: OtherProfile[]
  error?: string
  ok?: string
}) {
  const [shuttleInfo, setShuttleInfo] = useState(initialShuttle)
  const [bookings, setBookings] = useState(initialBookings)
  const [isEditing, setIsEditing] = useState(false)

  const alreadyBookedUserIds = useMemo(() => {
    const ids = new Set<string>()
    for (const b of bookings) {
      ids.add(b.booker_id)
      for (const p of b.participants) {
        if (!p.is_guest && p.user_id) ids.add(p.user_id)
      }
    }
    return ids
  }, [bookings])

  const availableProfiles = useMemo(
    () => allOtherProfiles.filter(p => !alreadyBookedUserIds.has(p.id)),
    [allOtherProfiles, alreadyBookedUserIds],
  )

  const myBookingParticipantIds = useMemo(() => {
    const myBooking = bookings.find(b => b.booker_id === userId)
    const ids = new Set<string>()
    for (const p of myBooking?.participants ?? []) {
      if (!p.is_guest && p.user_id && p.user_id !== userId) ids.add(p.user_id)
    }
    return ids
  }, [bookings, userId])

  const myCurrentGuests = useMemo(() => {
    const myBooking = bookings.find(b => b.booker_id === userId)
    return (myBooking?.participants ?? [])
      .filter(p => p.is_guest)
      .map(p => p.guest_label ?? '')
      .join('\n')
  }, [bookings, userId])

  const editableProfiles = useMemo(
    () => allOtherProfiles.filter(p => !alreadyBookedUserIds.has(p.id) || myBookingParticipantIds.has(p.id)),
    [allOtherProfiles, alreadyBookedUserIds, myBookingParticipantIds],
  )

  const canBook =
    !myBookingId &&
    !alreadyBookedUserIds.has(userId) &&
    !['full', 'done', 'cancelled'].includes(shuttleInfo.status)
  const canCancel =
    !!myBookingId &&
    !['done', 'cancelled'].includes(shuttleInfo.status)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const channel = supabase
      .channel(`navetta-detail-${initialShuttle.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shuttles',
          filter: `id=eq.${initialShuttle.id}`,
        },
        (payload) => {
          const u = payload.new as ShuttleInfo
          setShuttleInfo(prev => ({ ...prev, available_seats: u.available_seats, status: u.status }))
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `shuttle_id=eq.${initialShuttle.id}`,
        },
        async (payload) => {
          const nb = payload.new as { id: string; booker_id: string }

          const { data: bookerProfile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', nb.booker_id)
            .single()

          // RLS: participant details only visible for own bookings
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

          setBookings(prev => [
            ...prev,
            {
              id: nb.id,
              booker_id: nb.booker_id,
              bookerUsername: bookerProfile?.username ?? '—',
              participants,
            },
          ])
        },
      )
      .on(
        'postgres_changes',
        // DELETE filter on shuttle_id requires REPLICA IDENTITY FULL;
        // without it, filter is skipped server-side → filter client-side instead
        { event: 'DELETE', schema: 'public', table: 'bookings' },
        (payload) => {
          const deleted = payload.old as { id: string }
          setBookings(prev => prev.filter(b => b.id !== deleted.id))
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [initialShuttle.id])

  const booked = shuttleInfo.max_seats - shuttleInfo.available_seats

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <StatusDot status={shuttleInfo.status} size="md" />
        <StatusBadge status={shuttleInfo.status} />
      </div>
      <h1 className="text-xl font-semibold mb-1">{formatFull(shuttleInfo.departure_time)}</h1>
      <p className="font-mono text-sm mb-8" style={{ color: 'var(--text-dim)' }}>
        {shuttleInfo.status === 'full'
          ? 'Posti esauriti'
          : `${shuttleInfo.available_seats} / ${shuttleInfo.max_seats} posti disponibili`}
      </p>

      {shuttleInfo.status === 'draft' && (
        <p
          className="rounded-sm border px-4 py-3 font-mono text-sm mb-6"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)', background: 'var(--bg-panel)' }}
        >
          Navetta in bozza — non ancora garantita. Verrà confermata al raggiungimento di{' '}
          {shuttleInfo.min_seats} prenotazioni.
        </p>
      )}

      {ok === '1' && <SuccessAlert message="Prenotazione confermata." />}
      {ok === 'modifica' && <SuccessAlert message="Prenotazione aggiornata." />}
      {error && <ErrorAlert message={ERROR_MSG[error] ?? 'Errore sconosciuto.'} />}

      {bookings.length > 0 && (
        <div className="mb-8">
          <p
            className="font-mono text-[10px] uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-muted)' }}
          >
            Chi si è prenotato ({booked})
          </p>
          <div className="flex flex-col gap-2">
            {bookings.map((b, i) => {
              const isMe = b.booker_id === userId
              return (
                <div
                  key={b.id}
                  className="rounded-sm border px-4 py-3"
                  style={{
                    borderColor: isMe ? 'var(--border)' : 'var(--border-subtle)',
                    background: isMe ? 'var(--bg-panel)' : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="font-mono text-[10px] w-4 text-right flex-shrink-0"
                      style={{ color: 'var(--text-dim)' }}
                    >
                      {i + 1}.
                    </span>
                    <span
                      className="font-mono text-xs font-medium"
                      style={{ color: isMe ? 'var(--text)' : 'var(--text-muted)' }}
                    >
                      {b.bookerUsername}
                      {isMe && (
                        <span className="ml-1.5" style={{ color: 'var(--text-dim)' }}>
                          (tu)
                        </span>
                      )}
                    </span>
                  </div>
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
              )
            })}
          </div>
        </div>
      )}

      {myBookingId && canCancel && (
        <div className="mb-8">
          {!isEditing ? (
            <div className="flex gap-2">
              <Button
                onClick={() => setIsEditing(true)}
                className="rounded-sm border px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors hover:border-[--red] hover:text-[--red]"
                style={{ background: 'none', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
              >
                Modifica
              </Button>
              <form action={cancelBooking}>
                <input type="hidden" name="booking_id" value={myBookingId} />
                <input type="hidden" name="shuttle_id" value={shuttleInfo.id} />
                <SubmitButton
                  className="rounded-sm border px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors hover:border-[--red] hover:text-[--red]"
                  style={{ background: 'none', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
                >
                  Cancella prenotazione
                </SubmitButton>
              </form>
            </div>
          ) : (
            <form action={updateBooking} className="flex flex-col gap-5">
              <input type="hidden" name="booking_id" value={myBookingId} />
              <input type="hidden" name="shuttle_id" value={shuttleInfo.id} />

              <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Modifica prenotazione
              </p>

              {editableProfiles.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    Altri partecipanti registrati
                  </label>
                  <div
                    className="rounded-sm border px-4 py-3 flex flex-col gap-2"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}
                  >
                    {editableProfiles.map(p => (
                      <label key={p.id} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          name="participant_ids"
                          value={p.id}
                          defaultChecked={myBookingParticipantIds.has(p.id)}
                          className="w-3.5 h-3.5 accent-[--red]"
                        />
                        <span className="font-mono text-sm" style={{ color: 'var(--text)' }}>{p.username}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Ospiti
                </label>
                <textarea
                  name="guests"
                  rows={3}
                  defaultValue={myCurrentGuests}
                  placeholder={'Mario Rossi\nGiulia Bianchi'}
                  className="w-full rounded-sm border px-3 py-2.5 font-mono text-sm resize-none"
                  style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-muted)', color: 'var(--text)' }}
                />
                <p className="font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>
                  Un nome per riga. Ogni ospite occupa un posto.
                </p>
              </div>

              <div className="flex gap-2 mt-1">
                <SubmitButton
                  className="rounded-sm border px-5 py-2.5 font-mono text-xs uppercase tracking-wide transition-colors"
                  style={{ background: 'var(--red)', borderColor: 'var(--red)', color: 'white' }}
                >
                  Salva modifiche
                </SubmitButton>
                <Button
                  onClick={() => setIsEditing(false)}
                  className="rounded-sm border px-5 py-2.5 font-mono text-xs uppercase tracking-wide transition-colors hover:border-[--red] hover:text-[--red]"
                  style={{ borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
                >
                  Annulla
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {canBook && (
        <form action={createBooking} className="flex flex-col gap-5">
          <input type="hidden" name="shuttle_id" value={shuttleInfo.id} />

          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Nuova prenotazione
          </p>

          <div
            className="rounded-sm border px-4 py-3"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}
          >
            <p className="font-mono text-xs mb-1" style={{ color: 'var(--text-dim)' }}>
              Prenotato da
            </p>
            <span className="font-mono text-sm" style={{ color: 'var(--text)' }}>
              {username} (tu)
            </span>
          </div>

          {availableProfiles.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Altri partecipanti registrati
              </label>
              <div
                className="rounded-sm border px-4 py-3 flex flex-col gap-2"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}
              >
                {availableProfiles.map(p => (
                  <label key={p.id} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      name="participant_ids"
                      value={p.id}
                      className="w-3.5 h-3.5 accent-[--red]"
                    />
                    <span className="font-mono text-sm" style={{ color: 'var(--text)' }}>
                      {p.username}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Ospiti
            </label>
            <textarea
              name="guests"
              rows={3}
              placeholder={'Mario Rossi\nGiulia Bianchi'}
              className="w-full rounded-sm border px-3 py-2.5 font-mono text-sm resize-none"
              style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-muted)', color: 'var(--text)' }}
            />
            <p className="font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>
              Un nome per riga. Ogni ospite occupa un posto.
            </p>
          </div>

          <div className="mt-1">
            <SubmitButton
              className="rounded-sm border px-5 py-2.5 font-mono text-xs uppercase tracking-wide transition-colors"
              style={{ background: 'var(--red)', borderColor: 'var(--red)', color: 'white' }}
            >
              Prenota
            </SubmitButton>
          </div>
        </form>
      )}
    </>
  )
}
