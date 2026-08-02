import { after } from 'next/server'
import Link from 'next/link'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader, MasterBadge } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { ErrorAlert } from '@/components/ui/alert'
import { RealtimeRefresher } from '@/components/ui/realtime-refresher'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { supabaseAdmin } from '@/lib/supabase'
import { markExpiredProposalsCancelled } from '@/lib/data'
import { formatShort } from '@/lib/date'
import { errorMessage } from '@/lib/errors'

export default async function MasterPropostePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  after(() => markExpiredProposalsCancelled())

  const { data: proposals } = await supabaseAdmin
    .from('proposals')
    .select('id, departure_time, notes, status, created_at, proposer_id')
    .order('created_at', { ascending: false })

  const proposerIds = [...new Set(proposals?.map(p => p.proposer_id) ?? [])]
  const { data: proposerProfiles } = proposerIds.length
    ? await supabaseAdmin.from('profiles').select('id, username').in('id', proposerIds)
    : { data: [] as { id: string; username: string }[] }
  const profileById = Object.fromEntries((proposerProfiles ?? []).map(p => [p.id, p]))

  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
  const cutoff = twoDaysAgo.toISOString()

  const pending = proposals?.filter(p => p.status === 'pending') ?? []
  const others  = proposals?.filter(p => p.status !== 'pending' && p.departure_time >= cutoff) ?? []

  return (
    <PageLayout>
      <RealtimeRefresher tables={['proposals']} />
      <PageHeader backHref="/" right={<MasterBadge />} />

      <h1 className="mb-8 leading-none" style={{ fontFamily: "var(--font-display)", fontSize: "3rem", fontWeight: 400, color: "var(--text)" }}>Proposte</h1>

      {error && <ErrorAlert message={errorMessage(error)} />}

      {pending.length > 0 && (
        <section className="mb-8">
          <p className="font-mono text-xs uppercase tracking-widest mb-3"
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
                  className="flex items-center gap-4 rounded-2xl border px-5 py-3 no-underline transition-colors active:scale-95 group"
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
        <CollapsibleSection label="Storico" count={others.length}>
          <div className="flex flex-col gap-2">
            {others.map(p => {
              const proposerUsername = profileById[p.proposer_id]?.username ?? '—'
              return (
                <div key={p.id} className="flex items-center gap-4 rounded-2xl border px-4 py-3"
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
        </CollapsibleSection>
      )}

      {!pending.length && !others.length && (
        <p className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
          Nessuna proposta ancora.
        </p>
      )}
    </PageLayout>
  )
}
