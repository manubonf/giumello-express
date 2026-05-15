import Link from 'next/link'
import { NavetteLogo } from '@/components/ui/navettelogo'
import { supabaseAdmin } from '@/lib/supabase'

const STATUS_LABEL: Record<string, string> = {
  draft:     'Bozza',
  confirmed: 'Confermata',
  full:      'Completa',
  done:      'Effettuata',
  cancelled: 'Cancellata',
}

const STATUS_COLOR: Record<string, string> = {
  draft:     '#888',
  confirmed: '#22c55e',
  full:      '#f59e0b',
  done:      '#555',
  cancelled: '#e01110',
}

function formatDatetime(iso: string) {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

export default async function MasterNavettePage() {
  const { data: shuttles } = await supabaseAdmin
    .from('shuttles')
    .select('*')
    .order('departure_time', { ascending: false })

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
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: STATUS_COLOR[s.status] ?? '#888' }}
                />
                <span className="flex-1 min-w-0">
                  <span className="block font-medium text-sm" style={{ color: '#e8e8e8' }}>
                    {formatDatetime(s.departure_time)}
                  </span>
                  <span className="block font-mono text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                    {STATUS_LABEL[s.status]} · {s.available_seats}/{s.max_seats} posti
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
