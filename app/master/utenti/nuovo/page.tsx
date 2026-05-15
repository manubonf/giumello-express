import Link from 'next/link'
import { NavetteLogo } from '@/components/ui/navettelogo'
import { SubmitButton } from '@/components/ui/submit-button'
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

        <h1 className="text-xl font-semibold mb-8">Nuovo utente</h1>

        {/* Credenziali generate — mostrate una volta sola */}
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

        {/* Errore */}
        {error && (
          <p className="rounded-sm border px-4 py-3 font-mono text-sm mb-6"
            style={{ borderColor: 'var(--red-border)', color: 'var(--red)', background: 'var(--red-muted)' }}>
            {ERROR_MSG[error] ?? 'Errore sconosciuto.'}
          </p>
        )}

        {/* Form — nascosto dopo il successo */}
        {ok !== '1' && (
          <form action={createUser} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs uppercase tracking-wide"
                style={{ color: 'var(--text-muted)' }}>
                Username
              </label>
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
              <p className="font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>
                Solo lettere minuscole, numeri e underscore (2–30 caratteri). La password viene generata automaticamente.
              </p>
            </div>

            <div className="flex gap-3 mt-2">
              <SubmitButton
                className="rounded-sm border px-5 py-2.5 font-mono text-xs uppercase tracking-wide transition-colors"
                style={{ background: 'var(--red)', borderColor: 'var(--red)', color: 'white' }}
              >
                Crea utente
              </SubmitButton>
              <Link
                href="/master/utenti"
                className="rounded-sm border px-5 py-2.5 font-mono text-xs uppercase tracking-wide no-underline transition-colors hover:border-[--red] hover:text-[--red]"
                style={{ borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
              >
                Annulla
              </Link>
            </div>
          </form>
        )}

        {/* Dopo il successo — azioni rapide */}
        {ok === '1' && (
          <div className="flex gap-3">
            <Link
              href="/master/utenti/nuovo"
              className="rounded-sm border px-5 py-2.5 font-mono text-xs uppercase tracking-wide no-underline transition-colors"
              style={{ background: 'var(--red)', borderColor: 'var(--red)', color: 'white' }}
            >
              + Altro utente
            </Link>
            <Link
              href="/master/utenti"
              className="rounded-sm border px-5 py-2.5 font-mono text-xs uppercase tracking-wide no-underline transition-colors hover:border-[--red] hover:text-[--red]"
              style={{ borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
            >
              Vai alla lista
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
