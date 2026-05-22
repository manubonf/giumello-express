'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type Profile = { id: string; username: string }

export type ProfileChip = { kind: 'profile'; id: string; username: string }
export type GuestChip = { kind: 'guest'; key: string; name: string }
export type Chip = ProfileChip | GuestChip

function chipKey(chip: Chip): string {
  return chip.kind === 'profile' ? `p-${chip.id}` : chip.key
}

const DEBOUNCE_MS = 250
const MIN_QUERY = 2
const MAX_FAVORITES_SHOWN = 5

export function ParticipantsInput({
  userId,
  username,
  hardExcludedUserIds,
  initialChips = [],
  initialIncludeMe = true,
  availableSeats,
  currentParticipantCount = 0,
}: {
  userId: string
  username: string
  hardExcludedUserIds: Set<string>
  initialChips?: Chip[]
  initialIncludeMe?: boolean
  availableSeats: number
  currentParticipantCount?: number
}) {
  const [chips, setChips] = useState<Chip[]>(initialChips)
  const [includeMe, setIncludeMe] = useState(initialIncludeMe)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [favorites, setFavorites] = useState<Profile[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [guestFormOpen, setGuestFormOpen] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [showAllFavorites, setShowAllFavorites] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedProfileIds = new Set(
    chips.filter((c): c is ProfileChip => c.kind === 'profile').map(c => c.id),
  )

  const totalParticipants = chips.length + (includeMe ? 1 : 0)
  const remainingSeats = availableSeats + currentParticipantCount - totalParticipants

  useEffect(() => {
    fetch('/api/favorites')
      .then(r => r.json())
      .then((data: Profile[]) => {
        if (!Array.isArray(data)) return
        setFavorites(data)
        setFavoriteIds(new Set(data.map(f => f.id)))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < MIN_QUERY) {
      setSearchResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/profiles?q=${encodeURIComponent(query)}&limit=10`)
        if (res.ok) setSearchResults(await res.json())
      } catch {}
    }, DEBOUNCE_MS)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

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

  const addChip = useCallback((profile: Profile) => {
    if (selectedProfileIds.has(profile.id)) return
    setChips(prev => [...prev, { kind: 'profile', id: profile.id, username: profile.username }])
    setQuery('')
    setSearchResults([])
    setDropdownOpen(false)
    inputRef.current?.focus()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chips])

  function removeChip(key: string) {
    setChips(prev => prev.filter(c => chipKey(c) !== key))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && query === '' && chips.length > 0) {
      setChips(prev => prev.slice(0, -1))
    }
    if (e.key === 'Escape') setDropdownOpen(false)
  }

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

  function addGuest() {
    const name = guestName.replace(/\n/g, ' ').trim()
    if (!name) return
    setChips(prev => [...prev, { kind: 'guest', key: `guest-${Date.now()}`, name }])
    setGuestName('')
    setGuestFormOpen(false)
  }

  const visibleFavorites = favorites.filter(
    f => !selectedProfileIds.has(f.id) && !hardExcludedUserIds.has(f.id),
  )
  const visibleSearch = searchResults.filter(
    p => !selectedProfileIds.has(p.id) && !hardExcludedUserIds.has(p.id),
  )
  const showDropdown = dropdownOpen && (visibleFavorites.length > 0 || visibleSearch.length > 0)
  const favoritesSlice = showAllFavorites ? visibleFavorites : visibleFavorites.slice(0, MAX_FAVORITES_SHOWN)

  return (
    <div className="flex flex-col gap-4">

      {/* Include me */}
      <label className="flex items-center gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          name="include_booker"
          checked={includeMe}
          onChange={e => setIncludeMe(e.target.checked)}
          className="w-3.5 h-3.5 accent-[--red]"
        />
        <span className="font-mono text-sm" style={{ color: 'var(--text)' }}>
          Includi me ({username})
        </span>
      </label>

      {/* Search */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="participant-search"
          className="font-mono text-xs uppercase tracking-wide"
          style={{ color: 'var(--text-muted)' }}
        >
          Aggiungi partecipante
        </label>

        <div className="relative">
          <div
            className="flex items-center gap-2 rounded-sm border px-3"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
              style={{ color: 'var(--text-dim)', flexShrink: 0 }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id="participant-search"
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setDropdownOpen(true) }}
              onFocus={() => setDropdownOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Cerca utente…"
              aria-label="Cerca partecipante"
              aria-autocomplete="list"
              aria-expanded={showDropdown}
              aria-controls={showDropdown ? 'participant-dropdown' : undefined}
              className="flex-1 py-2.5 bg-transparent outline-none font-mono text-sm"
              style={{ color: 'var(--text)' }}
            />
          </div>

          {showDropdown && (
            <div
              id="participant-dropdown"
              ref={dropdownRef}
              role="listbox"
              aria-label="Suggerimenti partecipanti"
              className="absolute left-0 right-0 top-full mt-1 z-10 rounded-sm border shadow-lg py-1"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}
            >
              {visibleFavorites.length > 0 && (
                <>
                  <p
                    className="font-mono text-[10px] uppercase tracking-widest px-3 pt-2 pb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Preferiti
                  </p>
                  {favoritesSlice.map(f => (
                    <DropdownRow
                      key={f.id}
                      profile={f}
                      isFavorite={favoriteIds.has(f.id)}
                      onSelect={() => addChip(f)}
                      onToggleFavorite={e => toggleFavorite(f, e)}
                    />
                  ))}
                  {!showAllFavorites && visibleFavorites.length > MAX_FAVORITES_SHOWN && (
                    <button
                      type="button"
                      onClick={() => setShowAllFavorites(true)}
                      className="w-full text-left font-mono text-xs px-3 py-1.5"
                      style={{ color: 'var(--text-dim)' }}
                    >
                      Mostra tutti ({visibleFavorites.length - MAX_FAVORITES_SHOWN} altri)
                    </button>
                  )}
                </>
              )}

              {visibleSearch.length > 0 && (
                <>
                  {visibleFavorites.length > 0 && (
                    <div className="mx-3 my-1.5" style={{ height: 1, background: 'var(--border-subtle)' }} />
                  )}
                  <p
                    className="font-mono text-[10px] uppercase tracking-widest px-3 pt-1 pb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Risultati
                  </p>
                  {visibleSearch.map(p => (
                    <DropdownRow
                      key={p.id}
                      profile={p}
                      isFavorite={favoriteIds.has(p.id)}
                      onSelect={() => addChip(p)}
                      onToggleFavorite={e => toggleFavorite(p, e)}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chips */}
      {chips.length > 0 && (
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Partecipanti selezionati"
        >
          {chips.map(chip => (
            <span
              key={chipKey(chip)}
              className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-xs"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)', color: 'var(--text)' }}
            >
              {chip.kind === 'guest' ? `${chip.name} (ospite)` : chip.username}
              <button
                type="button"
                onClick={() => removeChip(chipKey(chip))}
                aria-label={`Rimuovi ${chip.kind === 'guest' ? chip.name : chip.username}`}
                className="leading-none transition-colors hover:text-[--red]"
                style={{ color: 'var(--text-dim)' }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Guest form */}
      {!guestFormOpen ? (
        <button
          type="button"
          onClick={() => setGuestFormOpen(true)}
          className="self-start font-mono text-xs transition-colors hover:text-[--text]"
          style={{ color: 'var(--text-dim)' }}
        >
          + Aggiungi ospite manuale
        </button>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="guest-name-input"
            className="font-mono text-xs uppercase tracking-wide"
            style={{ color: 'var(--text-muted)' }}
          >
            Nome ospite
          </label>
          <div className="flex gap-2 items-center">
            <input
              id="guest-name-input"
              type="text"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGuest() } }}
              placeholder="Mario Rossi"
              aria-label="Nome ospite manuale"
              autoFocus
              className="flex-1 rounded-sm border px-3 py-2 font-mono text-sm"
              style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-muted)', color: 'var(--text)' }}
            />
            <button
              type="button"
              onClick={addGuest}
              className="rounded-sm border px-3 py-2 font-mono text-xs uppercase tracking-wide"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)', color: 'var(--text)' }}
            >
              Aggiungi
            </button>
            <button
              type="button"
              onClick={() => { setGuestFormOpen(false); setGuestName('') }}
              className="font-mono text-xs transition-colors hover:text-[--text]"
              style={{ color: 'var(--text-dim)' }}
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Seat counter */}
      <p
        className="font-mono text-xs"
        style={{ color: remainingSeats < 0 ? 'var(--red)' : 'var(--text-dim)' }}
      >
        {totalParticipants}{' '}
        {totalParticipants === 1 ? 'partecipante' : 'partecipanti'}
        {' · '}
        {remainingSeats >= 0
          ? `${remainingSeats} ${remainingSeats === 1 ? 'posto rimanente' : 'posti rimanenti'}`
          : `${Math.abs(remainingSeats)} ${Math.abs(remainingSeats) === 1 ? 'posto in eccesso' : 'posti in eccesso'}`}
      </p>

      {/* Hidden form inputs */}
      {chips.map(chip =>
        chip.kind === 'profile' ? (
          <input key={chip.id} type="hidden" name="participant_ids" value={chip.id} />
        ) : (
          <input key={chip.key} type="hidden" name="guest_names" value={chip.name} />
        ),
      )}
    </div>
  )
}

function DropdownRow({
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
        aria-label={`Seleziona ${profile.username}`}
      >
        {profile.username}
      </button>
      <button
        type="button"
        onClick={onToggleFavorite}
        className="text-base leading-none transition-colors"
        style={{ color: isFavorite ? 'var(--red)' : 'var(--text-dim)' }}
        aria-label={isFavorite ? `Rimuovi ${profile.username} dai preferiti` : `Aggiungi ${profile.username} ai preferiti`}
        title={isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
      >
        {isFavorite ? '★' : '☆'}
      </button>
    </div>
  )
}
