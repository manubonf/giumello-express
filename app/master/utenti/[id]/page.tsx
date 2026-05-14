import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NavetteLogo } from '@/components/ui/navettelogo'
import { supabaseAdmin } from '@/lib/supabase'
import { deleteUser } from '@/app/master/utenti/actions'

function formatDatetime(iso: string) {
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso))
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between py-3"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <span className="font-mono text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span className="text-sm font-medium" style={{ color: '#e8e8e8' }}>{value}</span>
    </div>
  )
}

export default async function UtenteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, username, role, created_at')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  const isMaster = profile.role === 'master'

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
            <Link href="/master/utenti" className="font-mono text-sm no-underline"
              style={{ color: 'var(--text-muted)' }}>←</Link>
            <NavetteLogo height={24} />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest rounded-sm border px-1.5 py-0.5"
            style={{ color: 'var(--red)', borderColor: 'var(--red-border)' }}>
            Master
          </span>
        </header>

        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-xl font-semibold">{profile.username}</h1>
          <span
            className="font-mono text-[10px] uppercase tracking-widest rounded-sm border px-1.5 py-0.5"
            style={{
              color: isMaster ? 'var(--red)' : 'var(--text-muted)',
              borderColor: isMaster ? 'var(--red-border)' : 'var(--border-muted)',
            }}
          >
            {isMaster ? 'Master' : 'Utente'}
          </span>
        </div>

        <div className="rounded-sm border mb-8" style={{ borderColor: 'var(--border)' }}>
          <div className="px-4">
            <Row label="Username" value={profile.username} />
            <Row label="Ruolo" value={isMaster ? 'Master' : 'Utente base'} />
            <Row label="Creato il" value={formatDatetime(profile.created_at)} />
          </div>
        </div>

        {!isMaster && (
          <form action={deleteUser}>
            <input type="hidden" name="id" value={profile.id} />
            <button
              type="submit"
              className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors hover:border-[--red] hover:text-[--red]"
              style={{ background: 'none', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
            >
              Rimuovi utente
            </button>
          </form>
        )}

      </div>
    </div>
  )
}
