'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { StatusBadge, StatusDot } from '@/components/ui/status-badge'
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
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

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
        <div className="flex flex-col gap-2 mb-8">
          {active.map(s => {
            const label = dayLabel(s.departure_time)
            return (
            <Link
              key={s.id}
              href={`/base/navette/${s.id}`}
              className="flex items-center gap-4 rounded-sm border px-4 py-4 no-underline transition-colors active:scale-95 group"
              style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'inherit' }}
            >
              <StatusDot status={s.status} />
              <span className="flex-1 min-w-0">
                {label && (
                  <span className="block font-mono text-[10px] uppercase tracking-widest mb-0.5"
                    style={{ color: label === 'oggi' ? 'var(--red)' : 'var(--text-muted)' }}>
                    {label}
                  </span>
                )}
                <span className="block font-medium text-sm" style={{ color: 'var(--text)' }}>
                  {formatShort(s.departure_time)}
                </span>
                <span className="flex items-center gap-2 mt-1">
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
                    <span className="rounded-sm border px-1.5 py-0.5 font-mono text-[10px] leading-none"
                      style={{ borderColor: '#22c55e60', color: '#22c55e', background: '#22c55e12' }}>
                      Prenotato
                    </span>
                  )}
                </span>
                {s.status === 'draft' && (
                  <p className="font-mono text-[11px] mt-1.5" style={{ color: 'var(--text-dim)' }}>
                    Navetta in bozza — non ancora garantita
                  </p>
                )}
              </span>
              <span
                className="font-mono text-sm transition-transform group-hover:translate-x-0.5"
                style={{ color: 'var(--border)' }}
              >→</span>
            </Link>
          )})}
        </div>
      )}

      {initialStorico.length > 0 && (
        <section>
          <p
            className="font-mono text-[10px] uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-muted)' }}
          >
            Storico
          </p>
          <div className="flex flex-col gap-2" style={{ opacity: 0.6 }}>
            {initialStorico.map(s => (
              <Link
                key={s.id}
                href={`/base/navette/${s.id}`}
                className="flex items-center gap-4 rounded-sm border px-4 py-3 no-underline transition-colors active:scale-95 group"
                style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', color: 'inherit' }}
              >
                <StatusDot status={s.status} />
                <span className="flex-1 min-w-0">
                  <span className="block font-medium text-sm" style={{ color: 'var(--text)' }}>
                    {formatShort(s.departure_time)}
                  </span>
                  <span className="flex items-center gap-2">
                    <StatusBadge status={s.status} />
                    {bookedSet.has(s.id) && (
                      <span className="rounded-sm border px-1.5 py-0.5 font-mono text-[10px] leading-none"
                        style={{ borderColor: '#22c55e60', color: '#22c55e', background: '#22c55e12' }}>
                        Prenotato
                      </span>
                    )}
                  </span>
                </span>
                <span
                  className="font-mono text-sm transition-transform group-hover:translate-x-0.5"
                  style={{ color: 'var(--border)' }}
                >→</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
