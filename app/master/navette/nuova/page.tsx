import Link from 'next/link'
import { NavetteLogo } from '@/components/ui/navettelogo'
import { SubmitButton } from '@/components/ui/submit-button'
import { supabaseAdmin } from '@/lib/supabase'
import { createShuttle } from '@/app/master/navette/actions'

const ERROR_MSG: Record<string, string> = {
  'dati-non-validi':  'Controlla i dati inseriti.',
  'errore-creazione': 'Errore durante la creazione. Riprova.',
}

export default async function NuovaNavettePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  const { data: settings } = await supabaseAdmin
    .from('app_settings')
    .select('min_interest_threshold')
    .single()

  const defaultMinSeats = settings?.min_interest_threshold ?? 5

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
            <Link href="/master/navette" className="font-mono text-sm no-underline"
              style={{ color: 'var(--text-muted)' }}>←</Link>
            <NavetteLogo height={24} />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest rounded-sm border px-1.5 py-0.5"
            style={{ color: 'var(--red)', borderColor: 'var(--red-border)' }}>
            Master
          </span>
        </header>

        <h1 className="text-xl font-semibold mb-8">Nuova navetta</h1>

        {error && (
          <p className="rounded-sm border px-4 py-3 font-mono text-sm mb-6"
            style={{ borderColor: 'var(--red-border)', color: 'var(--red)', background: 'var(--red-muted)' }}>
            {ERROR_MSG[error] ?? 'Errore sconosciuto.'}
          </p>
        )}

        <form action={createShuttle} className="flex flex-col gap-5">

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}>
              Data e ora partenza
            </label>
            <input
              type="datetime-local"
              name="departure_time"
              required
              className="w-full rounded-sm border px-3 py-2.5 font-mono text-sm"
              style={{
                background: 'var(--bg-panel)',
                borderColor: 'var(--border-muted)',
                color: 'var(--text)',
                colorScheme: 'dark',
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}>
              Posti totali
            </label>
            <input
              type="number"
              name="max_seats"
              min={1}
              required
              placeholder="es. 20"
              className="w-full rounded-sm border px-3 py-2.5 font-mono text-sm"
              style={{
                background: 'var(--bg-panel)',
                borderColor: 'var(--border-muted)',
                color: 'var(--text)',
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}>
              Soglia minima prenotazioni
              <span className="ml-2 normal-case" style={{ color: 'var(--text-dim)' }}>
                (default: {defaultMinSeats})
              </span>
            </label>
            <input
              type="number"
              name="min_seats"
              min={1}
              placeholder={String(defaultMinSeats)}
              className="w-full rounded-sm border px-3 py-2.5 font-mono text-sm"
              style={{
                background: 'var(--bg-panel)',
                borderColor: 'var(--border-muted)',
                color: 'var(--text)',
              }}
            />
            <p className="font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>
              Lascia vuoto per usare il valore globale. Al raggiungimento di questa soglia la navetta passerà automaticamente a &laquo;Confermata&raquo;.
            </p>
          </div>

          <div className="flex gap-3 mt-2">
            <SubmitButton
              className="rounded-sm border px-5 py-2.5 font-mono text-xs uppercase tracking-wide transition-colors"
              style={{ background: 'var(--red)', borderColor: 'var(--red)', color: 'white' }}
            >
              Crea navetta
            </SubmitButton>
            <Link
              href="/master/navette"
              className="rounded-sm border px-5 py-2.5 font-mono text-xs uppercase tracking-wide no-underline transition-colors hover:border-[--red] hover:text-[--red]"
              style={{ borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
            >
              Annulla
            </Link>
          </div>

        </form>

      </div>
    </div>
  )
}
