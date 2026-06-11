import Image from 'next/image'
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
        background: 'linear-gradient(160deg, #061d26 0%, #082d3e 55%, #0a3347 100%)',
      }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-10"
        style={{
          background: 'rgba(8, 45, 62, 0.9)',
          borderColor: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <Image
          src="/FlyLibell_Logotipo_White.svg"
          alt="Flylibell Navette"
          height={36}
          width={0}
          style={{ width: 'auto', height: '36px' }}
          priority
        />

        <p
          className="uppercase mt-2 mb-10 tracking-widest"
          style={{
            color: 'rgba(240,236,232,0.55)',
            fontSize: '0.65rem',
            fontFamily: 'var(--font-mono)',
            paddingLeft: '2px',
          }}
        >
          Accesso riservato
        </p>

        <form action={login} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="username"
              className="font-mono text-[10px] uppercase tracking-wider"
              style={{ color: 'rgba(240,236,232,0.55)' }}>
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              required
              className="rounded-xl border px-4 py-3 font-mono text-sm outline-none transition-all w-full"
              style={{
                background: 'rgba(6, 29, 38, 0.7)',
                borderColor: 'rgba(255,255,255,0.12)',
                color: '#f0ece8',
              }}
              placeholder="il tuo nome utente"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password"
              className="font-mono text-[10px] uppercase tracking-wider"
              style={{ color: 'rgba(240,236,232,0.55)' }}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="rounded-xl border px-4 py-3 font-mono text-sm outline-none transition-all w-full"
              style={{
                background: 'rgba(6, 29, 38, 0.7)',
                borderColor: 'rgba(255,255,255,0.12)',
                color: '#f0ece8',
              }}
              placeholder="••••••••••"
            />
          </div>

          {hasError && (
            <div role="alert" className="rounded-xl border px-4 py-3 font-mono text-xs"
              style={{ color: '#7dc4e4', background: 'rgba(68,143,184,0.1)', borderColor: 'rgba(68,143,184,0.3)' }}>
              Username o password non corretti.
            </div>
          )}

          <SubmitButton
            className="mt-1 rounded-xl py-3.5 font-mono text-xs font-semibold uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: '#448fb8' }}
          >
            Accedi
          </SubmitButton>
        </form>
      </div>
    </div>
  )
}
