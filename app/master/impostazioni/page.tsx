import Link from 'next/link'
import { NavetteLogo } from '@/components/ui/navettelogo'
import { SubmitButton } from '@/components/ui/submit-button'
import { supabaseAdmin } from '@/lib/supabase'
import { updateSettings } from '@/app/master/impostazioni/actions'

const ERROR_MSG: Record<string, string> = {
  'valore-non-valido': 'Inserisci un numero intero maggiore di zero.',
  'errore-salvataggio': 'Errore durante il salvataggio. Riprova.',
}

export default async function ImpostazioniPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>
}) {
  const { error, ok } = await searchParams

  const { data: settings } = await supabaseAdmin
    .from('app_settings')
    .select('min_interest_threshold, updated_at')
    .single()

  const current = settings?.min_interest_threshold ?? 5

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

        <h1 className="text-xl font-semibold mb-8">Impostazioni</h1>

        {ok === '1' && (
          <p className="rounded-sm border px-4 py-3 font-mono text-sm mb-6"
            style={{ borderColor: '#22c55e40', color: '#22c55e', background: '#22c55e10' }}>
            Impostazioni salvate.
          </p>
        )}

        {error && (
          <p className="rounded-sm border px-4 py-3 font-mono text-sm mb-6"
            style={{ borderColor: 'var(--red-border)', color: 'var(--red)', background: 'var(--red-muted)' }}>
            {ERROR_MSG[error] ?? 'Errore sconosciuto.'}
          </p>
        )}

        <form action={updateSettings} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}>
              Soglia minima prenotazioni
            </label>
            <input
              type="number"
              name="min_interest_threshold"
              min={1}
              required
              defaultValue={current}
              className="w-full rounded-sm border px-3 py-2.5 font-mono text-sm"
              style={{
                background: 'var(--bg-panel)',
                borderColor: 'var(--border-muted)',
                color: 'var(--text)',
              }}
            />
            <p className="font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>
              Numero minimo di prenotazioni affinché una navetta in bozza passi automaticamente a &laquo;Confermata&raquo;.
              Questo valore è il default per le nuove navette; le navette già create non vengono modificate.
            </p>
          </div>

          <div className="mt-2">
            <SubmitButton
              className="rounded-sm border px-5 py-2.5 font-mono text-xs uppercase tracking-wide transition-colors"
              style={{ background: 'var(--red)', borderColor: 'var(--red)', color: 'white' }}
            >
              Salva
            </SubmitButton>
          </div>
        </form>

      </div>
    </div>
  )
}
