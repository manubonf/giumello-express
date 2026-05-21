import Link from 'next/link'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { SuccessAlert } from '@/components/ui/alert'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { formatShort } from '@/lib/date'

export default async function PropostePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>
}) {
  const { ok } = await searchParams
  const { profile } = await getCurrentUser()

  const { data: proposals } = await supabaseAdmin
    .from('proposals')
    .select('id, departure_time, notes, status, created_at, proposer_id')
    .order('created_at', { ascending: false })

  const proposerIds = [...new Set(proposals?.map(p => p.proposer_id) ?? [])]
  const { data: proposerProfiles } = proposerIds.length
    ? await supabaseAdmin.from('profiles').select('id, username').in('id', proposerIds)
    : { data: [] as { id: string; username: string }[] }
  const profileById = Object.fromEntries((proposerProfiles ?? []).map(p => [p.id, p]))

  return (
    <PageLayout>
      <PageHeader
        backHref="/"
        right={
          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            {profile?.username}
          </span>
        }
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Proposte</h1>
        <Link
          href="/base/proposte/nuova"
          className="rounded-sm border px-3 py-1.5 font-mono text-xs uppercase tracking-wide no-underline transition-colors hover:border-[--red] hover:text-[--red] active:scale-95"
          style={{ borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
        >
          + Nuova
        </Link>
      </div>

      {ok === '1' && <SuccessAlert message="Proposta inviata. Il master la valuterà a breve." />}

      {!proposals?.length ? (
        <p className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
          Nessuna proposta ancora.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {proposals.map(p => {
            const proposerUsername = profileById[p.proposer_id]?.username ?? '—'
            return (
              <div key={p.id} className="rounded-sm border px-4 py-3"
                style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <span className="block font-medium text-sm" style={{ color: 'var(--text)' }}>
                      {formatShort(p.departure_time)}
                    </span>
                    <span className="flex items-center gap-2 mt-1">
                      <StatusBadge status={p.status} />
                      <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
                        {proposerUsername}
                      </span>
                    </span>
                    {p.notes && (
                      <p className="font-mono text-xs mt-2" style={{ color: 'var(--text-dim)' }}>
                        {p.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </PageLayout>
  )
}
