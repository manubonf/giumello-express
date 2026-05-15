import Link from 'next/link'
import { NavetteLogo } from '@/components/ui/navettelogo'
import { SubmitButton } from '@/components/ui/submit-button'
import { logout } from '@/app/login/actions'
import { getCurrentUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const STATUS_LABEL: Record<string, string> = {
  draft:     'Bozza',
  confirmed: 'Confermata',
  full:      'Completa',
}

const STATUS_COLOR: Record<string, string> = {
  draft:     '#888',
  confirmed: '#22c55e',
  full:      '#f59e0b',
}

function formatDatetime(iso: string) {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

export default async function NavettePage() {
  const { profile } = await getCurrentUser()

  const supabase = await createSupabaseServerClient()
  const { data: shuttles } = await supabase
    .from('shuttles')
    .select('id, status, departure_time, max_seats, available_seats')
    .in('status', ['draft', 'confirmed', 'full'])
    .order('departure_time', { ascending: true })

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
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-mono text-xs"
              style={{ color: 'var(--text-muted)' }}>
              {profile?.username ?? '—'}
            </span>
            <form action={logout}>
              <SubmitButton
                className="rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors hover:border-[--red] hover:text-[--red]"
                style={{ background: 'none', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
              >
                Esci
              </SubmitButton>
            </form>
          </div>
        </header>

        <h1 className="text-xl font-semibold mb-8">Navette disponibili</h1>

        {!shuttles?.length ? (
          <p className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
            Nessuna navetta disponibile al momento.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {shuttles.map(s => (
              <Link
                key={s.id}
                href={`/navette/${s.id}`}
                className="flex items-center gap-4 rounded-sm border px-4 py-4 no-underline transition-colors group"
                style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'inherit' }}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: STATUS_COLOR[s.status] ?? '#888' }}
                />
                <span className="flex-1 min-w-0">
                  <span className="block font-medium text-sm" style={{ color: '#e8e8e8' }}>
                    {formatDatetime(s.departure_time)}
                  </span>
                  <span className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs rounded-sm px-1.5 py-0.5"
                      style={{
                        color: STATUS_COLOR[s.status] ?? '#888',
                        background: `${STATUS_COLOR[s.status] ?? '#888'}18`,
                        border: `1px solid ${STATUS_COLOR[s.status] ?? '#888'}40`,
                      }}>
                      {STATUS_LABEL[s.status]}
                    </span>
                    {s.status === 'full' ? (
                      <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
                        Posti esauriti
                      </span>
                    ) : (
                      <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
                        {s.available_seats} posti disponibili
                      </span>
                    )}
                  </span>
                  {s.status === 'draft' && (
                    <p className="font-mono text-[11px] mt-1.5" style={{ color: '#888' }}>
                      Navetta in bozza — non ancora garantita
                    </p>
                  )}
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
