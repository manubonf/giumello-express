'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { SubmitButton } from '@/components/ui/submit-button'
import { Button } from '@/components/ui/button'
import { masterBookUser, masterBookGuest } from '@/app/master/navette/actions'

type Profile = { id: string; username: string }
type ActivePanel = null | 'user' | 'guest'

const DEBOUNCE_MS = 250
const MIN_QUERY = 2

export function MasterBookingPanel({
  shuttleId,
  excludedUserIds,
}: {
  shuttleId: string
  excludedUserIds: string[]
}) {
  const excludedSet = new Set(excludedUserIds)
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)

  function closePanel() {
    setActivePanel(null)
    setSelectedUser(null)
  }

  return (
    <div>
      <p
        className="font-mono text-[10px] uppercase tracking-widest mb-3"
        style={{ color: 'var(--text-muted)' }}
      >
        Aggiungi prenotazione
      </p>

      {activePanel === null && (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setActivePanel('user')}
            className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors hover:opacity-80"
            style={{ background: 'none', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            Prenota utente
          </Button>
          <Button
            onClick={() => setActivePanel('guest')}
            className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors hover:opacity-80"
            style={{ background: 'none', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            Prenota ospite
          </Button>
        </div>
      )}

      {activePanel === 'user' && (
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            Seleziona un utente base da prenotare
          </p>
          <MasterUserSearchInput
            excludedSet={excludedSet}
            selectedUser={selectedUser}
            onSelect={setSelectedUser}
          />
          <div className="flex gap-2 mt-1">
            {selectedUser && (
              <form action={masterBookUser}>
                <input type="hidden" name="shuttle_id" value={shuttleId} />
                <input type="hidden" name="user_id" value={selectedUser.id} />
                <SubmitButton
                  className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide"
                  style={{ background: '#22c55e', borderColor: '#22c55e', color: 'white' }}
                >
                  Conferma
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

      {activePanel === 'guest' && (
        <form action={masterBookGuest} className="flex flex-col gap-3">
          <input type="hidden" name="shuttle_id" value={shuttleId} />
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
              style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'var(--text)' }}
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
  )
}

// ─── Ricerca utente per il master (con preferiti sempre visibili e stelline) ───

const MAX_FAVORITES_SHOWN = 5

function MasterUserSearchInput({
  excludedSet,
  selectedUser,
  onSelect,
}: {
  excludedSet: Set<string>
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

  const visibleFavorites = favorites.filter(f => !excludedSet.has(f.id))
  const visibleResults = results.filter(p => !excludedSet.has(p.id))
  // Dropdown solo per i risultati di ricerca; i preferiti sono fissi sopra la barra
  const showDropdown = dropdownOpen && visibleResults.length > 0
  const favoritesSlice = showAllFavorites
    ? visibleFavorites
    : visibleFavorites.slice(0, MAX_FAVORITES_SHOWN)

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
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" aria-hidden="true" style={{ color: 'var(--text-dim)', flexShrink: 0 }}>
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
              <MasterDropdownRow
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

function MasterDropdownRow({
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
    <div className="flex items-center gap-1 px-3 py-1.5 cursor-pointer hover:opacity-80"
      role="option" aria-selected={false}>
      <button type="button" onClick={onSelect}
        className="flex-1 text-left font-mono text-sm" style={{ color: 'var(--text)' }}>
        {profile.username}
      </button>
      <button type="button" onClick={onToggleFavorite}
        className="text-base leading-none transition-colors"
        style={{ color: isFavorite ? 'var(--red)' : 'var(--text-dim)' }}
        aria-label={isFavorite
          ? `Rimuovi ${profile.username} dai preferiti`
          : `Aggiungi ${profile.username} ai preferiti`}
        title={isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}>
        {isFavorite ? '★' : '☆'}
      </button>
    </div>
  )
}
