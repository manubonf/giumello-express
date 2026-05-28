'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { SubmitButton } from '@/components/ui/submit-button'
import { Button } from '@/components/ui/button'
import { StatusBadge, StatusDot } from '@/components/ui/status-badge'
import { ErrorAlert, SuccessAlert } from '@/components/ui/alert'
import {
  bookSelf,
  bookOtherUser,
  bookGuest,
  leaveBookingAsParticipant,
  cancelBooking,
} from '@/app/base/navette/actions'
import { formatFull, dayLabel } from '@/lib/date'

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
}

type Profile = { id: string; username: string }

// ─── Messaggi di errore ───────────────────────────────────────────────────────

const ERROR_MSG: Record<string, string> = {
  'posti-insufficienti':          'Posti insufficienti per questa prenotazione.',
  'navetta-non-prenotabile':      'Questa navetta non è più prenotabile.',
  'prenotazione-esistente':       'Sei già presente come passeggero su questa navetta.',
  'partecipante-già-prenotato':   'Questo utente è già presente su questa navetta.',
  'partecipante-non-valido':      'Non è possibile prenotare per un utente master.',
  'nome-ospite-mancante':         'Inserisci il nome dell\'ospite.',
  'errore-prenotazione':          'Errore durante la prenotazione. Riprova.',
  'non-autorizzato':              'Operazione non autorizzata.',
}

// ─── Componente principale ────────────────────────────────────────────────────

type ActivePanel = null | 'user' | 'guest'

export function NavettaDetail({
  shuttle: initialShuttle,
  userId,
  username,
  initialBookings,
  error,
  ok,
}: {
  shuttle: ShuttleInfo
  userId: string
  username: string
  initialBookings: BookingEntry[]
  error?: string
  ok?: string
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
  const myParticipantInOtherBooking = useMemo(() => {
    for (const b of bookings) {
      if (b.booker_id === userId) continue
      const p = b.participants.find(p => !p.is_guest && p.user_id === userId)
      if (p) return { ...p, bookerUsername: b.bookerUsername }
    }
    return null
  }, [bookings, userId])

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
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

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
          const participants: ParticipantEntry[] = (parts ?? []).map((p: any) => ({
            id: p.id,
            is_guest: p.is_guest,
            guest_label: p.guest_label,
            user_id: p.user_id ?? null,
            username: p.is_guest ? null : (p.profiles?.username ?? null),
          }))
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
      {error && <ErrorAlert message={ERROR_MSG[error] ?? 'Errore sconosciuto.'} />}

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
          className="rounded-sm border px-4 py-3 mb-6"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}
        >
          <p className="font-mono text-xs mb-3" style={{ color: 'var(--text-dim)' }}>
            Sei stato prenotato da{' '}
            <span style={{ color: 'var(--text)' }}>{myParticipantInOtherBooking.bookerUsername}</span>
          </p>
          {!['done', 'cancelled'].includes(shuttleInfo.status) && (
            <form action={leaveBookingAsParticipant}>
              <input type="hidden" name="shuttle_id" value={shuttleInfo.id} />
              <SubmitButton
                className="rounded-sm border px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors"
                style={{ background: 'var(--red)', borderColor: 'var(--red)', color: 'white' }}
              >
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
                  className="flex items-center justify-between rounded-sm border px-4 py-3"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}
                >
                  <span className="font-mono text-sm" style={{ color: 'var(--text)' }}>
                    {label}
                  </span>
                  {canCancel && (
                    <form action={cancelBooking}>
                      <input type="hidden" name="booking_id" value={b.id} />
                      <input type="hidden" name="shuttle_id" value={shuttleInfo.id} />
                      <SubmitButton
                        className="rounded-sm border px-2.5 py-1 font-mono text-xs uppercase tracking-wide transition-colors"
                        style={{ background: 'var(--red)', borderColor: 'var(--red)', color: 'white' }}
                      >
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
            className="font-mono text-[10px] uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-muted)' }}
          >
            Nuova prenotazione
          </p>

          {/* Selezione modalità */}
          {activePanel === null && (
            <div className="flex flex-wrap gap-2">
              {canBookSelf && (
                <form action={bookSelf}>
                  <input type="hidden" name="shuttle_id" value={shuttleInfo.id} />
                  <SubmitButton
                    className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors"
                    style={{ background: '#22c55e', borderColor: '#22c55e', color: 'white' }}
                  >
                    Prenota per te
                  </SubmitButton>
                </form>
              )}
              <Button
                onClick={() => setActivePanel('user')}
                className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors hover:opacity-80"
                style={{ background: 'none', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                Prenota un utente
              </Button>
              <Button
                onClick={() => setActivePanel('guest')}
                className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors hover:opacity-80"
                style={{ background: 'none', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
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
                    <SubmitButton
                      className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide"
                      style={{ background: '#22c55e', borderColor: '#22c55e', color: 'white' }}
                    >
                      Conferma prenotazione
                    </SubmitButton>
                  </form>
                )}
                <Button
                  onClick={closePanel}
                  className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors hover:border-[--red] hover:text-[--red]"
                  style={{ background: 'none', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
                >
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
                  className="flex-1 rounded-sm border px-3 py-2 font-mono text-sm outline-none"
                  style={{
                    background: 'var(--bg-panel)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)',
                  }}
                />
              </div>
              <div className="flex gap-2">
                <SubmitButton
                  className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide"
                  style={{ background: '#22c55e', borderColor: '#22c55e', color: 'white' }}
                >
                  Prenota ospite
                </SubmitButton>
                <Button
                  onClick={closePanel}
                  className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors hover:border-[--red] hover:text-[--red]"
                  style={{ background: 'none', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
                >
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

// ─── UserSearchInput ──────────────────────────────────────────────────────────
// Ricerca utente singolo con debounce, preferiti sempre visibili e stelline toggle.

const DEBOUNCE_MS = 250
const MIN_QUERY = 2
const MAX_FAVORITES_SHOWN = 5

function UserSearchInput({
  excludedUserIds,
  currentUserId,
  selectedUser,
  onSelect,
}: {
  excludedUserIds: Set<string>
  currentUserId: string
  selectedUser: Profile | null
  onSelect: (profile: Profile | null) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [favorites, setFavorites] = useState<Profile[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showAllFavorites, setShowAllFavorites] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Carica preferiti
  useEffect(() => {
    fetch('/api/favorites')
      .then(r => r.json())
      .then((data: Profile[]) => {
        if (Array.isArray(data)) {
          setFavorites(data)
          setFavoriteIds(new Set(data.map(f => f.id)))
        }
      })
      .catch(() => {})
  }, [])

  // Ricerca con debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < MIN_QUERY) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/profiles?q=${encodeURIComponent(query)}&limit=10`)
        if (res.ok) setResults(await res.json())
      } catch {}
    }, DEBOUNCE_MS)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  // Chiudi dropdown al click esterno
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (
        !inputRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const selectUser = useCallback((profile: Profile) => {
    onSelect(profile)
    setQuery('')
    setResults([])
    setDropdownOpen(false)
  }, [onSelect])

  async function toggleFavorite(profile: Profile, e: React.MouseEvent) {
    e.stopPropagation()
    const isFav = favoriteIds.has(profile.id)
    if (isFav) {
      setFavoriteIds(prev => { const s = new Set(prev); s.delete(profile.id); return s })
      setFavorites(prev => prev.filter(f => f.id !== profile.id))
      await fetch('/api/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profile.id }),
      })
    } else {
      setFavoriteIds(prev => new Set([...prev, profile.id]))
      setFavorites(prev => [...prev, profile])
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profile.id }),
      })
    }
  }

  const visibleFavorites = favorites.filter(
    f => !excludedUserIds.has(f.id) && f.id !== currentUserId,
  )
  const visibleResults = results.filter(
    p => !excludedUserIds.has(p.id) && p.id !== currentUserId,
  )
  // Dropdown solo per i risultati di ricerca; i preferiti sono fissi sopra la barra
  const showDropdown = dropdownOpen && visibleResults.length > 0
  const favoritesSlice = showAllFavorites
    ? visibleFavorites
    : visibleFavorites.slice(0, MAX_FAVORITES_SHOWN)

  // Utente già selezionato → mostra chip con ×
  if (selectedUser) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 font-mono text-sm"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)', color: 'var(--text)' }}
        >
          {selectedUser.username}
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="leading-none transition-colors hover:text-[--red]"
            style={{ color: 'var(--text-dim)' }}
            aria-label="Rimuovi selezione"
          >
            ×
          </button>
        </span>
      </div>
    )
  }

  return (
    <div>
      {/* Preferiti fissi sopra la barra di ricerca */}
      {visibleFavorites.length > 0 && (
        <div className="mb-2">
          <p
            className="font-mono text-[10px] uppercase tracking-widest mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Preferiti
          </p>
          <div
            className="rounded-sm border py-1"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}
          >
            {favoritesSlice.map(f => (
              <div key={f.id} className="flex items-center gap-1 px-3 py-1.5">
                <button
                  type="button"
                  onClick={() => selectUser(f)}
                  className="flex-1 text-left font-mono text-sm transition-opacity hover:opacity-70"
                  style={{ color: 'var(--text)' }}
                >
                  {f.username}
                </button>
                <button
                  type="button"
                  onClick={e => toggleFavorite(f, e)}
                  className="text-base leading-none transition-opacity hover:opacity-70"
                  style={{ color: 'var(--red)' }}
                  aria-label={`Rimuovi ${f.username} dai preferiti`}
                  title="Rimuovi dai preferiti"
                >
                  ★
                </button>
              </div>
            ))}
            {!showAllFavorites && visibleFavorites.length > MAX_FAVORITES_SHOWN && (
              <button
                type="button"
                onClick={() => setShowAllFavorites(true)}
                className="w-full text-left font-mono text-xs px-3 py-1.5 transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-dim)' }}
              >
                Mostra tutti ({visibleFavorites.length - MAX_FAVORITES_SHOWN} altri)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Barra di ricerca con dropdown solo per i risultati */}
      <div className="relative">
        <div
          className="flex items-center gap-2 rounded-sm border px-3"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}
        >
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" aria-hidden="true"
            style={{ color: 'var(--text-dim)', flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setDropdownOpen(true) }}
            onFocus={() => setDropdownOpen(true)}
            placeholder="Cerca utente…"
            autoFocus
            className="flex-1 py-2.5 bg-transparent outline-none font-mono text-sm"
            style={{ color: 'var(--text)' }}
          />
        </div>

        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full mt-1 z-10 rounded-sm border shadow-lg py-1"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}
          >
            {visibleResults.map(p => (
              <SearchDropdownRow
                key={p.id}
                profile={p}
                isFavorite={favoriteIds.has(p.id)}
                onSelect={() => selectUser(p)}
                onToggleFavorite={e => toggleFavorite(p, e)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SearchDropdownRow ─────────────────────────────────────────────────────────

function SearchDropdownRow({
  profile,
  isFavorite,
  onSelect,
  onToggleFavorite,
}: {
  profile: Profile
  isFavorite: boolean
  onSelect: () => void
  onToggleFavorite: (e: React.MouseEvent) => void
}) {
  return (
    <div
      className="flex items-center gap-1 px-3 py-1.5 cursor-pointer hover:opacity-80"
      role="option"
      aria-selected={false}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 text-left font-mono text-sm"
        style={{ color: 'var(--text)' }}
      >
        {profile.username}
      </button>
      <button
        type="button"
        onClick={onToggleFavorite}
        className="text-base leading-none transition-colors"
        style={{ color: isFavorite ? 'var(--red)' : 'var(--text-dim)' }}
        aria-label={isFavorite
          ? `Rimuovi ${profile.username} dai preferiti`
          : `Aggiungi ${profile.username} ai preferiti`}
        title={isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
      >
        {isFavorite ? '★' : '☆'}
      </button>
    </div>
  )
}
