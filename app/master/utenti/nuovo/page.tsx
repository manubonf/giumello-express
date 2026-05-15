import Link from 'next/link'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader, MasterBadge } from '@/components/ui/page-header'
import { SubmitButton } from '@/components/ui/submit-button'
import { ErrorAlert } from '@/components/ui/alert'
import { FormField } from '@/components/ui/form-field'
import { createUser } from '@/app/master/utenti/actions'

const ERROR_MSG: Record<string, string> = {
  'username-non-valido': 'Username non valido. Usa solo lettere minuscole, numeri e underscore (2–30 caratteri).',
  'username-esistente':  'Username già in uso.',
  'errore-creazione':    'Errore durante la creazione. Riprova.',
}

export default async function NuovoUtentePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; u?: string; pw?: string }>
}) {
  const { error, ok, u, pw } = await searchParams

  return (
    <PageLayout>
      <PageHeader backHref="/master/utenti" right={<MasterBadge />} />

      <h1 className="text-xl font-semibold mb-8">Nuovo utente</h1>

      {ok === '1' && u && pw && (
        <div className="rounded-sm border px-4 py-4 mb-8"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
          <p className="font-mono text-[10px] uppercase tracking-widest mb-4"
            style={{ color: 'var(--text-muted)' }}>
            Utente creato — salva le credenziali ora
          </p>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>Username</span>
              <span className="font-mono text-sm font-semibold" style={{ color: '#e8e8e8' }}>{u}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border-subtle)' }} />
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>Password</span>
              <span className="font-mono text-sm font-semibold tracking-wide" style={{ color: '#e8e8e8' }}>{pw}</span>
            </div>
          </div>
          <p className="font-mono text-[11px] mt-4" style={{ color: '#888' }}>
            La password non verrà mostrata di nuovo. Comunicala all&apos;utente e poi chiudi questa pagina.
          </p>
        </div>
      )}

      {error && <ErrorAlert message={ERROR_MSG[error] ?? 'Errore sconosciuto.'} />}

      {ok !== '1' && (
        <form action={createUser} className="flex flex-col gap-5">
          <FormField
            label="Username"
            description="Solo lettere minuscole, numeri e underscore (2–30 caratteri). La password viene generata automaticamente."
          >
            <input
              type="text"
              name="username"
              required
              autoComplete="off"
              placeholder="es. mario_rossi"
              className="w-full rounded-sm border px-3 py-2.5 font-mono text-sm"
              style={{
                background: 'var(--bg-panel)',
                borderColor: 'var(--border-muted)',
                color: 'var(--text)',
              }}
            />
          </FormField>

          <div className="flex gap-3 mt-2">
            <SubmitButton
              className="rounded-sm border px-5 py-2.5 font-mono text-xs uppercase tracking-wide transition-colors"
              style={{ background: 'var(--red)', borderColor: 'var(--red)', color: 'white' }}
            >
              Crea utente
            </SubmitButton>
            <Link
              href="/master/utenti"
              className="rounded-sm border px-5 py-2.5 font-mono text-xs uppercase tracking-wide no-underline transition-colors hover:border-[--red] hover:text-[--red] active:scale-95"
              style={{ borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
            >
              Annulla
            </Link>
          </div>
        </form>
      )}

      {ok === '1' && (
        <div className="flex gap-3">
          <Link
            href="/master/utenti/nuovo"
            className="rounded-sm border px-5 py-2.5 font-mono text-xs uppercase tracking-wide no-underline transition-colors active:scale-95"
            style={{ background: 'var(--red)', borderColor: 'var(--red)', color: 'white' }}
          >
            + Altro utente
          </Link>
          <Link
            href="/master/utenti"
            className="rounded-sm border px-5 py-2.5 font-mono text-xs uppercase tracking-wide no-underline transition-colors hover:border-[--red] hover:text-[--red] active:scale-95"
            style={{ borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
          >
            Vai alla lista
          </Link>
        </div>
      )}
    </PageLayout>
  )
}
