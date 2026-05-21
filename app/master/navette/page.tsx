import Link from 'next/link'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader, MasterBadge } from '@/components/ui/page-header'
import { StatusDot, StatusBadge, STATUS_LABEL } from '@/components/ui/status-badge'
import { supabaseAdmin } from '@/lib/supabase'
import { formatShort } from '@/lib/date'

const ACTIVE_STATUSES = ['draft', 'confirmed', 'full']
const HISTORY_STATUSES = ['done', 'cancelled']

export default async function MasterNavettePage() {
  // Promuovi automaticamente le navette confermate/complete scadute
  await supabaseAdmin
    .from('shuttles')
    .update({ status: 'done' })
    .in('status', ['confirmed', 'full'])
    .lt('departure_time', new Date().toISOString())

  const { data: shuttles } = await supabaseAdmin
    .from('shuttles')
    .select('*')
    .order('departure_time', { ascending: true })

  const active  = (shuttles ?? []).filter(s => ACTIVE_STATUSES.includes(s.status))
  const storico = (shuttles ?? []).filter(s => HISTORY_STATUSES.includes(s.status)).reverse()

  return (
    <PageLayout>
      <PageHeader backHref="/" right={<MasterBadge />} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Navette</h1>
        <Link
          href="/master/navette/nuova"
          className="rounded-sm border px-3 py-1.5 font-mono text-xs uppercase tracking-wide no-underline transition-colors hover:border-[--red] hover:text-[--red] active:scale-95"
          style={{ borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
        >
          + Nuova
        </Link>
      </div>

      {!active.length && !storico.length && (
        <p className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
          Nessuna navetta ancora.
        </p>
      )}

      {active.length > 0 && (
        <div className="flex flex-col gap-2 mb-8">
          {active.map(s => (
            <Link
              key={s.id}
              href={`/master/navette/${s.id}`}
              className="flex items-center gap-4 rounded-sm border px-4 py-3 no-underline transition-colors group"
              style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'inherit' }}
            >
              <StatusDot status={s.status} />
              <span className="flex-1 min-w-0">
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
          ))}
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
                className="flex items-center gap-4 rounded-sm border px-4 py-3 no-underline group"
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
    </PageLayout>
  )
}
