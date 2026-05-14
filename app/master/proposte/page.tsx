import Link from 'next/link'
import { NavetteLogo } from '@/components/ui/navettelogo'
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
            <Link href="/master" className="font-mono text-sm no-underline"
              style={{ color: 'var(--text-muted)' }}>←</Link>
            <NavetteLogo height={24} />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest rounded-sm border px-1.5 py-0.5"
            style={{ color: 'var(--red)', borderColor: 'var(--red-border)' }}>
            Master
          </span>
        </header>

        <h1 className="text-xl font-semibold mb-8">Proposte</h1>

        {error && (
          <p className="rounded-sm border px-4 py-3 font-mono text-sm mb-6"
            style={{ borderColor: 'var(--red-border)', color: 'var(--red)', background: 'var(--red-muted)' }}>
            {ERROR_MSG[error] ?? 'Errore sconosciuto.'}
          </p>
        )}

        {/* Pendenti */}
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
                      <span className="block font-medium text-sm" style={{ color: '#e8e8e8' }}>
                        {formatDatetime(p.departure_time)}
                      </span>
                      <span className="font-mono text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                        {proposerUsername}
                        {p.notes && ` · ${p.notes.slice(0, 60)}${p.notes.length > 60 ? '…' : ''}`}
                      </span>
                    </span>
                    <span className="font-mono text-xs rounded-sm px-1.5 py-0.5"
                      style={{
                        color: '#f59e0b',
                        background: '#f59e0b18',
                        border: '1px solid #f59e0b40',
                      }}>
                      In attesa
                    </span>
                    <span className="font-mono text-sm transition-transform group-hover:translate-x-0.5"
                      style={{ color: 'var(--border)' }}>→</span>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Storico */}
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
                      <span className="block font-medium text-sm" style={{ color: '#e8e8e8' }}>
                        {formatDatetime(p.departure_time)}
                      </span>
                      <span className="font-mono text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                        {proposerUsername}
                      </span>
                    </span>
                    <span className="font-mono text-xs rounded-sm px-1.5 py-0.5"
                      style={{
                        color: STATUS_COLOR[p.status] ?? '#888',
                        background: `${STATUS_COLOR[p.status] ?? '#888'}18`,
                        border: `1px solid ${STATUS_COLOR[p.status] ?? '#888'}40`,
                      }}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
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

      </div>
    </div>
  )
}
