import Link from 'next/link'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader, MasterBadge } from '@/components/ui/page-header'
import { SubmitButton } from '@/components/ui/submit-button'
import { ErrorAlert } from '@/components/ui/alert'
import { FormField } from '@/components/ui/form-field'
import { CredentialBox } from '@/components/ui/credential-box'
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

      {ok === '1' && u && pw && <CredentialBox username={u} password={pw} />}

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
