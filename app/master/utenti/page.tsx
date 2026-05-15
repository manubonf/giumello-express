import Link from 'next/link'
import { NavetteLogo } from '@/components/ui/navettelogo'
import { supabaseAdmin } from '@/lib/supabase'

const ROLE_LABEL: Record<string, string> = {
  master: 'Master',
  base:   'Utente',
}

const ROLE_COLOR: Record<string, string> = {
  master: 'var(--red)',
  base:   'var(--text-muted)',
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium' }).format(new Date(iso))
}

export default async function MasterUtentiPage() {
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, username, role, created_at')
    .order('created_at', { ascending: false })

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
                  <span className="block font-medium text-sm" style={{ color: '#e8e8e8' }}>
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

      </div>
    </div>
  )
}
