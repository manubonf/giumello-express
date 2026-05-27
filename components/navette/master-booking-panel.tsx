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

// ─── Ricerca utente per il master ─────────────────────────────────────────────

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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/favorites')
      .then(r => r.json())
      .then((data: Profile[]) => { if (Array.isArray(data)) setFavorites(data) })
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

  const visibleFavorites = favorites.filter(f => !excludedSet.has(f.id))
  const visibleResults = results.filter(p => !excludedSet.has(p.id))
  const showFavorites = dropdownOpen && !query && visibleFavorites.length > 0
  const showResults = dropdownOpen && visibleResults.length > 0
  const showDropdown = showFavorites || showResults

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
          {showFavorites && (
            <>
              <p className="font-mono text-[10px] uppercase tracking-widest px-3 pt-2 pb-1"
                style={{ color: 'var(--text-muted)' }}>Preferiti</p>
              {visibleFavorites.map(f => (
                <button key={f.id} type="button" onClick={() => selectUser(f)}
                  className="w-full text-left px-3 py-1.5 font-mono text-sm hover:opacity-80"
                  style={{ color: 'var(--text)' }}>
                  {f.username}
                </button>
              ))}
            </>
          )}
          {showResults && (
            <>
              {showFavorites && (
                <div className="mx-3 my-1.5" style={{ height: 1, background: 'var(--border-subtle)' }} />
              )}
              <p className="font-mono text-[10px] uppercase tracking-widest px-3 pt-1 pb-1"
                style={{ color: 'var(--text-muted)' }}>Risultati</p>
              {visibleResults.map(p => (
                <button key={p.id} type="button" onClick={() => selectUser(p)}
                  className="w-full text-left px-3 py-1.5 font-mono text-sm hover:opacity-80"
                  style={{ color: 'var(--text)' }}>
                  {p.username}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
