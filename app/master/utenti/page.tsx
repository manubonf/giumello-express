import Link from 'next/link'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader, MasterBadge } from '@/components/ui/page-header'
import { supabaseAdmin } from '@/lib/supabase'
import { formatDate } from '@/lib/date'

const ROLE_LABEL: Record<string, string> = {
  master: 'Master',
  base:   'Utente',
}

const ROLE_COLOR: Record<string, string> = {
  master: 'var(--red)',
  base:   'var(--text-muted)',
}

export default async function MasterUtentiPage() {
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, username, role, created_at')
    .order('created_at', { ascending: false })

  return (
    <PageLayout>
      <PageHeader backHref="/" right={<MasterBadge />} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Utenti</h1>
        <Link
          href="/master/utenti/nuovo"
          className="rounded-sm border px-3 py-1.5 font-mono text-xs uppercase tracking-wide no-underline transition-colors hover:border-[--red] hover:text-[--red] active:scale-95"
          style={{ borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
        >
          + Nuovo
        </Link>
      </div>

      {!profiles?.length ? (
        <p className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
          Nessun utente.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {profiles.map(p => (
            <Link
              key={p.id}
              href={`/master/utenti/${p.id}`}
              className="flex items-center gap-4 rounded-sm border px-4 py-3 no-underline transition-colors group"
              style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'inherit' }}
            >
              <span className="flex-1 min-w-0">
                <span className="block font-medium text-sm" style={{ color: 'var(--text)' }}>
                  {p.username}
                </span>
                <span className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xs"
                    style={{ color: ROLE_COLOR[p.role] ?? 'var(--text-muted)' }}>
                    {ROLE_LABEL[p.role] ?? p.role}
                  </span>
                  <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
                    · {formatDate(p.created_at)}
                  </span>
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
