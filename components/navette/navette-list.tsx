'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { StatusBadge, StatusDot } from '@/components/ui/status-badge'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { formatShort, dayLabel } from '@/lib/date'

type Shuttle = {
  id: string
  status: string
  departure_time: string
  max_seats: number
  available_seats: number
}

const ACTIVE_STATUSES = ['draft', 'confirmed', 'full']

export function NavetteList({
  initialActive,
  initialStorico,
  bookedIds = [],
}: {
  initialActive: Shuttle[]
  initialStorico: Shuttle[]
  bookedIds?: string[]
}) {
  const [active, setActive] = useState(initialActive)
  const bookedSet = new Set(bookedIds)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel('navette-list')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'shuttles' },
        (payload) => {
          const updated = payload.new as Shuttle
          if (!ACTIVE_STATUSES.includes(updated.status)) {
            setActive(prev => prev.filter(s => s.id !== updated.id))
            return
          }
          setActive(prev =>
            prev.map(s =>
              s.id === updated.id
                ? { ...s, available_seats: updated.available_seats, status: updated.status }
                : s,
            ),
          )
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <>
      {!active.length ? (
        <p className="font-mono text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          Nessuna navetta disponibile al momento.
        </p>
      ) : (
        <div className="flex flex-col gap-3 mb-8">
          {active.map(s => {
            const label = dayLabel(s.departure_time)
            return (
            <Link
              key={s.id}
              href={`/base/navette/${s.id}`}
              className="flex items-center gap-4 rounded-2xl border px-5 py-4 no-underline transition-all active:scale-95 group"
              style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'inherit' }}
            >
              <StatusDot status={s.status} />
              <span className="flex-1 min-w-0">
                {label && (
                  <span className="block font-mono text-xs uppercase tracking-widest mb-0.5"
                    style={{ color: label === 'oggi' ? 'var(--red)' : 'var(--text-muted)' }}>
                    {label}
                  </span>
                )}
                <span className="block font-semibold text-sm" style={{ color: 'var(--text)' }}>
                  {formatShort(s.departure_time)}
                </span>
                <span className="flex items-center gap-2 mt-1.5">
                  <StatusBadge status={s.status} />
                  {s.status === 'full' ? (
                    <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
                      Posti esauriti
                    </span>
                  ) : (
                    <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
                      {s.available_seats} posti disponibili
                    </span>
                  )}
                  {bookedSet.has(s.id) && (
                    <span className="rounded-lg border px-1.5 py-0.5 font-mono text-xs leading-none"
                      style={{ borderColor: '#16a34a38', color: '#15803d', background: 'rgba(22,163,74,0.08)' }}>
                      Prenotato
                    </span>
                  )}
                </span>
                {s.status === 'draft' && (
                  <p className="font-mono text-xs mt-1.5" style={{ color: 'var(--text-dim)' }}>
                    Navetta in bozza — non ancora garantita
                  </p>
                )}
              </span>
              <span
                className="font-mono text-base transition-transform group-hover:translate-x-1"
                style={{ color: 'var(--red)' }}
              >→</span>
            </Link>
          )})}
        </div>
      )}

      {initialStorico.length > 0 && (
        <CollapsibleSection label="Storico" count={initialStorico.length}>
          <div className="flex flex-col gap-2" style={{ opacity: 0.55 }}>
            {initialStorico.map(s => (
              <Link
                key={s.id}
                href={`/base/navette/${s.id}`}
                className="flex items-center gap-4 rounded-2xl border px-5 py-3 no-underline transition-all active:scale-95 group"
                style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', color: 'inherit' }}
              >
                <StatusDot status={s.status} />
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-sm" style={{ color: 'var(--text)' }}>
                    {formatShort(s.departure_time)}
                  </span>
                  <span className="flex items-center gap-2 mt-1">
                    <StatusBadge status={s.status} />
                    {bookedSet.has(s.id) && (
                      <span className="rounded-lg border px-1.5 py-0.5 font-mono text-xs leading-none"
                        style={{ borderColor: '#16a34a38', color: '#15803d', background: 'rgba(22,163,74,0.08)' }}>
                        Prenotato
                      </span>
                    )}
                  </span>
                </span>
                <span
                  className="font-mono text-base transition-transform group-hover:translate-x-1"
                  style={{ color: 'var(--text-dim)' }}
                >→</span>
              </Link>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </>
  )
}
