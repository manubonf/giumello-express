import Link from 'next/link'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader, MasterBadge } from '@/components/ui/page-header'
import { StatusDot, STATUS_LABEL } from '@/components/ui/status-badge'
import { supabaseAdmin } from '@/lib/supabase'
import { formatShort } from '@/lib/date'

export default async function MasterNavettePage() {
  const { data: shuttles } = await supabaseAdmin
    .from('shuttles')
    .select('*')
    .order('departure_time', { ascending: false })

  return (
    <PageLayout>
      <PageHeader backHref="/master" right={<MasterBadge />} />

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

      {!shuttles?.length ? (
        <p className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
          Nessuna navetta ancora.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {shuttles.map(s => (
            <Link
              key={s.id}
              href={`/master/navette/${s.id}`}
              className="flex items-center gap-4 rounded-sm border px-4 py-3 no-underline transition-colors group"
              style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'inherit' }}
            >
              <StatusDot status={s.status} />
              <span className="flex-1 min-w-0">
                <span className="block font-medium text-sm" style={{ color: '#e8e8e8' }}>
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
    </PageLayout>
  )
}
