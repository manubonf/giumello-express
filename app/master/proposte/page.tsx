import Link from 'next/link'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader, MasterBadge } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { ErrorAlert } from '@/components/ui/alert'
import { supabaseAdmin } from '@/lib/supabase'
import { formatShort } from '@/lib/date'

const ERROR_MSG: Record<string, string> = {
  'proposta-non-trovata': 'Proposta non trovata o già gestita.',
}

export default async function MasterPropostePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  const { data: proposals } = await supabaseAdmin
    .from('proposals')
    .select('id, departure_time, notes, status, created_at, proposer_id')
    .order('created_at', { ascending: false })

  const proposerIds = [...new Set(proposals?.map(p => p.proposer_id) ?? [])]
  const { data: proposerProfiles } = proposerIds.length
    ? await supabaseAdmin.from('profiles').select('id, username').in('id', proposerIds)
    : { data: [] as { id: string; username: string }[] }
  const profileById = Object.fromEntries((proposerProfiles ?? []).map(p => [p.id, p]))

  const pending = proposals?.filter(p => p.status === 'pending') ?? []
  const others  = proposals?.filter(p => p.status !== 'pending') ?? []

  return (
    <PageLayout>
      <PageHeader backHref="/" right={<MasterBadge />} />

      <h1 className="text-xl font-semibold mb-8">Proposte</h1>

      {error && <ErrorAlert message={ERROR_MSG[error] ?? 'Errore sconosciuto.'} />}

      {pending.length > 0 && (
        <section className="mb-8">
          <p className="font-mono text-[10px] uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-muted)' }}>
            Da valutare ({pending.length})
          </p>
          <div className="flex flex-col gap-2">
            {pending.map(p => {
              const proposerUsername = profileById[p.proposer_id]?.username ?? '—'
              return (
                <Link
                  key={p.id}
                  href={`/master/proposte/${p.id}`}
                  className="flex items-center gap-4 rounded-sm border px-4 py-3 no-underline transition-colors group"
                  style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'inherit' }}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium text-sm" style={{ color: 'var(--text)' }}>
                      {formatShort(p.departure_time)}
                    </span>
                    <span className="font-mono text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                      {proposerUsername}
                      {p.notes && ` · ${p.notes.slice(0, 60)}${p.notes.length > 60 ? '…' : ''}`}
                    </span>
                  </span>
                  <StatusBadge status={p.status} />
                  <span className="font-mono text-sm transition-transform group-hover:translate-x-0.5"
                    style={{ color: 'var(--border)' }}>→</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section>
          <p className="font-mono text-[10px] uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-muted)' }}>
            Storico
          </p>
          <div className="flex flex-col gap-2">
            {others.map(p => {
              const proposerUsername = profileById[p.proposer_id]?.username ?? '—'
              return (
                <div key={p.id} className="flex items-center gap-4 rounded-sm border px-4 py-3"
                  style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', opacity: 0.7 }}>
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium text-sm" style={{ color: 'var(--text)' }}>
                      {formatShort(p.departure_time)}
                    </span>
                    <span className="font-mono text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                      {proposerUsername}
                    </span>
                  </span>
                  <StatusBadge status={p.status} />
                </div>
              )
            })}
          </div>
        </section>
      )}

      {!pending.length && !others.length && (
        <p className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
          Nessuna proposta ancora.
        </p>
      )}
    </PageLayout>
  )
}
