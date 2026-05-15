import { NavetteLogo } from '@/components/ui/navettelogo'
import { SubmitButton } from '@/components/ui/submit-button'
import { login } from './actions'

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const hasError = params.error === 'credenziali-non-valide'

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: `
          linear-gradient(var(--red-muted) 1px, transparent 1px),
          linear-gradient(90deg, var(--red-muted) 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px',
      }}
    >
      <div
        className="w-full max-w-sm rounded-sm border p-10"
        style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-muted)' }}
      >
        <NavetteLogo height={36} />

        <p className="font-mono text-[10px] uppercase tracking-widest mt-1 mb-10"
          style={{ color: 'var(--text-muted)', paddingLeft: '2px' }}>
          Accesso riservato
        </p>

        <form action={login} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username"
              className="font-mono text-[10px] uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}>
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              required
              className="rounded-sm border px-3 py-2.5 font-mono text-sm outline-none transition-colors focus:border-[--red] w-full"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              placeholder="il tuo nome utente"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password"
              className="font-mono text-[10px] uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="rounded-sm border px-3 py-2.5 font-mono text-sm outline-none transition-colors focus:border-[--red] w-full"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              placeholder="••••••••••"
            />
          </div>

          {hasError && (
            <div role="alert" className="rounded-sm border px-3 py-2.5 font-mono text-xs"
              style={{ color: 'var(--red)', background: 'var(--red-muted)', borderColor: 'var(--red-border)' }}>
              Username o password non corretti.
            </div>
          )}

          <SubmitButton
            className="mt-1 rounded-sm py-3 font-mono text-xs font-medium uppercase tracking-widest text-white transition-colors hover:opacity-90"
            style={{ background: 'var(--red)' }}
          >
            Accedi
          </SubmitButton>
        </form>
      </div>
    </div>
  )
}