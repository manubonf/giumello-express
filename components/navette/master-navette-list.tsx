'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { StatusBadge, StatusDot, STATUS_LABEL } from '@/components/ui/status-badge'
import { formatShort, dayLabel } from '@/lib/date'

type Shuttle = {
  id: string
  status: string
  departure_time: string
  max_seats: number
  available_seats: number
}

const ACTIVE_STATUSES = ['draft', 'confirmed', 'full']
const HISTORY_STATUSES = ['done', 'cancelled']

function byDeparture(a: Shuttle, b: Shuttle) {
  return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime()
}

export function MasterNavetteList({
  initialActive,
  initialStorico,
}: {
  initialActive: Shuttle[]
  initialStorico: Shuttle[]
}) {
  const [active, setActive] = useState(initialActive)
  const [storico, setStorico] = useState(initialStorico)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const channel = supabase
      .channel('master-navette-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shuttles' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const s = payload.new as Shuttle
            if (ACTIVE_STATUSES.includes(s.status)) {
              setActive(prev => [...prev, s].sort(byDeparture))
            }
          } else if (payload.eventType === 'UPDATE') {
            const s = payload.new as Shuttle
            if (ACTIVE_STATUSES.includes(s.status)) {
              setStorico(prev => prev.filter(x => x.id !== s.id))
              setActive(prev => {
                const exists = prev.some(x => x.id === s.id)
                if (exists) return prev.map(x => x.id === s.id ? s : x)
                return [...prev, s].sort(byDeparture)
              })
            } else if (HISTORY_STATUSES.includes(s.status)) {
              setActive(prev => prev.filter(x => x.id !== s.id))
              const twoDaysAgo = new Date()
              twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
              if (s.departure_time >= twoDaysAgo.toISOString()) {
                setStorico(prev => {
                  const exists = prev.some(x => x.id === s.id)
                  if (exists) return prev.map(x => x.id === s.id ? s : x)
                  return [s, ...prev].sort((a, b) => byDeparture(b, a))
                })
              }
            }
          } else if (payload.eventType === 'DELETE') {
            const id = (payload.old as { id: string }).id
            setActive(prev => prev.filter(x => x.id !== id))
            setStorico(prev => prev.filter(x => x.id !== id))
          }
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (!active.length && !storico.length) {
    return (
      <p className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
        Nessuna navetta ancora.
      </p>
    )
  }

  return (
    <>
      {active.length > 0 && (
        <div className="flex flex-col gap-2 mb-8">
          {active.map(s => {
            const label = dayLabel(s.departure_time)
            return (
            <Link
              key={s.id}
              href={`/master/navette/${s.id}`}
              className="flex items-center gap-4 rounded-sm border px-4 py-3 no-underline transition-colors active:scale-95 group"
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
                <span className="block font-mono text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                  {STATUS_LABEL[s.status] ?? s.status} · {s.available_seats}/{s.max_seats} posti
                </span>
              </span>
              <span className="font-mono text-sm transition-transform group-hover:translate-x-0.5"
                style={{ color: 'var(--border)' }}>→</span>
            </Link>
          )})}
        </div>
      )}

      {storico.length > 0 && (
        <section>
          <p className="font-mono text-[10px] uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-muted)' }}>
            Storico
          </p>
          <div className="flex flex-col gap-2" style={{ opacity: 0.6 }}>
            {storico.map(s => (
              <Link
                key={s.id}
                href={`/master/navette/${s.id}`}
                className="flex items-center gap-4 rounded-sm border px-4 py-3 no-underline transition-colors active:scale-95 group"
                style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', color: 'inherit' }}
              >
                <StatusDot status={s.status} />
                <span className="flex-1 min-w-0">
                  <span className="block font-medium text-sm" style={{ color: 'var(--text)' }}>
                    {formatShort(s.departure_time)}
                  </span>
                  <span className="flex items-center gap-2 mt-0.5">
                    <StatusBadge status={s.status} />
                    <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
                      {s.available_seats}/{s.max_seats} posti
                    </span>
                  </span>
                </span>
                <span className="font-mono text-sm transition-transform group-hover:translate-x-0.5"
                  style={{ color: 'var(--border)' }}>→</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
