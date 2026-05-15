import Link from 'next/link'
import { NavetteLogo } from '@/components/ui/navettelogo'
import { SubmitButton } from '@/components/ui/submit-button'
import { createProposal } from '@/app/proposte/actions'

const ERROR_MSG: Record<string, string> = {
  'dati-non-validi': 'Inserisci una data e orario validi.',
  'errore-creazione': 'Errore durante l\'invio. Riprova.',
}

export default async function NuovaPropostaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

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
            <Link href="/proposte" className="font-mono text-sm no-underline"
              style={{ color: 'var(--text-muted)' }}>←</Link>
            <NavetteLogo height={24} />
          </div>
        </header>

        <h1 className="text-xl font-semibold mb-8">Nuova proposta</h1>

        {error && (
          <p className="rounded-sm border px-4 py-3 font-mono text-sm mb-6"
            style={{ borderColor: 'var(--red-border)', color: 'var(--red)', background: 'var(--red-muted)' }}>
            {ERROR_MSG[error] ?? 'Errore sconosciuto.'}
          </p>
        )}

        <form action={createProposal} className="flex flex-col gap-5">

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}>
              Data e ora proposta
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
              Note
              <span className="ml-2 normal-case" style={{ color: 'var(--text-dim)' }}>(opzionale)</span>
            </label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Eventuali note o motivazioni per la proposta..."
              className="w-full rounded-sm border px-3 py-2.5 font-mono text-sm resize-none"
              style={{
                background: 'var(--bg-panel)',
                borderColor: 'var(--border-muted)',
                color: 'var(--text)',
              }}
            />
          </div>

          <div className="flex gap-3 mt-2">
            <SubmitButton
              className="rounded-sm border px-5 py-2.5 font-mono text-xs uppercase tracking-wide transition-colors"
              style={{ background: 'var(--red)', borderColor: 'var(--red)', color: 'white' }}
            >
              Invia proposta
            </SubmitButton>
            <Link
              href="/proposte"
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
