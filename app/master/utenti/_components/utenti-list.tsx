'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/date'

type Utente = {
  id: string
  username: string
  created_at: string
}

function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase()
  const q = query.toLowerCase()
  let ti = 0
  for (let qi = 0; qi < q.length; qi++) {
    ti = t.indexOf(q[qi], ti)
    if (ti === -1) return false
    ti++
  }
  return true
}

function fuzzyScore(text: string, query: string): number {
  const t = text.toLowerCase()
  const q = query.toLowerCase()
  // Exact prefix match scores highest
  if (t.startsWith(q)) return 2
  // Substring match scores second
  if (t.includes(q)) return 1
  // Subsequence match scores lowest (but still matches)
  return 0
}

export function UtentiList({ utenti }: { utenti: Utente[] }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim()
    if (!q) return utenti
    return utenti
      .filter(u => fuzzyMatch(u.username, q))
      .sort((a, b) => fuzzyScore(b.username, q) - fuzzyScore(a.username, q))
  }, [utenti, search])

  return (
    <>
      <input
        type="search"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Cerca username…"
        autoComplete="off"
        autoFocus
        className="w-full rounded-sm border px-3 py-2 font-mono text-sm mb-5"
        style={{
          background: 'var(--bg-panel)',
          borderColor: 'var(--border-muted)',
          color: 'var(--text)',
        }}
      />

      {filtered.length === 0 ? (
        <p className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
          {search.trim() ? 'Nessun utente trovato.' : 'Nessun utente.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(u => (
            <Link
              key={u.id}
              href={`/master/utenti/${u.id}`}
              className="flex items-center gap-4 rounded-sm border px-4 py-3 no-underline transition-colors active:scale-95 group"
              style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'inherit' }}
            >
              <span className="flex-1 min-w-0">
                <span className="block font-medium text-sm" style={{ color: 'var(--text)' }}>
                  {u.username}
                </span>
                <span className="font-mono text-xs mt-0.5 block" style={{ color: 'var(--text-dim)' }}>
                  {formatDate(u.created_at)}
                </span>
              </span>
              <span className="font-mono text-sm transition-transform group-hover:translate-x-0.5"
                style={{ color: 'var(--border)' }}>→</span>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
