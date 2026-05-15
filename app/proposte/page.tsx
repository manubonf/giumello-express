import Link from 'next/link'
import { NavetteLogo } from '@/components/ui/navettelogo'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const STATUS_LABEL: Record<string, string> = {
  pending:  'In attesa',
  accepted: 'Accettata',
  rejected: 'Rifiutata',
}

const STATUS_COLOR: Record<string, string> = {
  pending:  '#f59e0b',
  accepted: '#22c55e',
  rejected: '#e01110',
}

function formatDatetime(iso: string) {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

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
    <div
      className="min-h-screen"
      style={{
        backgroundImage: `
          linear-gradient(var(--red-muted) 1px, transparent 1px),
          linear-gradient(90deg, var(--red-muted) 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px',
      }}
    >
      <div className="max-w-xl mx-auto px-4 py-6 pb-12">

        <header className="flex items-center justify-between pb-6 mb-10"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3">
            <Link href="/" className="font-mono text-sm no-underline"
              style={{ color: 'var(--text-muted)' }}>←</Link>
            <NavetteLogo height={24} />
          </div>
          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            {profile?.username}
          </span>
        </header>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">Proposte</h1>
          <Link
            href="/proposte/nuova"
            className="rounded-sm border px-3 py-1.5 font-mono text-xs uppercase tracking-wide no-underline transition-colors hover:border-[--red] hover:text-[--red] active:scale-95"
            style={{ borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
          >
            + Nuova
          </Link>
        </div>

        {ok === '1' && (
          <p className="rounded-sm border px-4 py-3 font-mono text-sm mb-6"
            style={{ borderColor: '#22c55e40', color: '#22c55e', background: '#22c55e10' }}>
            Proposta inviata. Il master la valuterà a breve.
          </p>
        )}

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
                      <span className="block font-medium text-sm" style={{ color: '#e8e8e8' }}>
                        {formatDatetime(p.departure_time)}
                      </span>
                      <span className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-xs rounded-sm px-1.5 py-0.5"
                          style={{
                            color: STATUS_COLOR[p.status] ?? '#888',
                            background: `${STATUS_COLOR[p.status] ?? '#888'}18`,
                            border: `1px solid ${STATUS_COLOR[p.status] ?? '#888'}40`,
                          }}>
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
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

      </div>
    </div>
  )
}
