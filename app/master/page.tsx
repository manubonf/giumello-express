import Link from 'next/link'
import { NavetteLogo } from '@/components/ui/navettelogo'
import { SubmitButton } from '@/components/ui/submit-button'
import { logout } from '@/app/login/actions'

export default function MasterPage() {
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
          <div className="flex items-center gap-3">
            <span
              className="font-mono text-[10px] uppercase tracking-widest rounded-sm border px-1.5 py-0.5"
              style={{ color: 'var(--red)', borderColor: 'var(--red-border)' }}
            >
              Master
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

        <h1 className="text-xl font-semibold mb-8">Pannello master</h1>

        <nav className="flex flex-col gap-3">
          <Link
            href="/master/navette"
            className="flex items-center gap-4 rounded-sm border px-5 py-4 no-underline transition-colors group"
            style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'inherit' }}
          >
            <span className="text-xl w-8 text-center flex-shrink-0">🚐</span>
            <span className="flex-1">
              <span className="block font-medium text-sm" style={{ color: '#e8e8e8' }}>Navette</span>
              <span className="block text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                Crea e gestisci il ciclo di vita delle navette
              </span>
            </span>
            <span className="font-mono text-sm transition-transform group-hover:translate-x-0.5"
              style={{ color: 'var(--border)' }}>→</span>
          </Link>
          <Link
            href="/master/utenti"
            className="flex items-center gap-4 rounded-sm border px-5 py-4 no-underline transition-colors group"
            style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'inherit' }}
          >
            <span className="text-xl w-8 text-center flex-shrink-0">👤</span>
            <span className="flex-1">
              <span className="block font-medium text-sm" style={{ color: '#e8e8e8' }}>Utenti</span>
              <span className="block text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                Crea e rimuovi utenti base
              </span>
            </span>
            <span className="font-mono text-sm transition-transform group-hover:translate-x-0.5"
              style={{ color: 'var(--border)' }}>→</span>
          </Link>
          <Link
            href="/master/proposte"
            className="flex items-center gap-4 rounded-sm border px-5 py-4 no-underline transition-colors group"
            style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'inherit' }}
          >
            <span className="text-xl w-8 text-center flex-shrink-0">💡</span>
            <span className="flex-1">
              <span className="block font-medium text-sm" style={{ color: '#e8e8e8' }}>Proposte</span>
              <span className="block text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                Valuta le proposte degli utenti
              </span>
            </span>
            <span className="font-mono text-sm transition-transform group-hover:translate-x-0.5"
              style={{ color: 'var(--border)' }}>→</span>
          </Link>
          <Link
            href="/master/impostazioni"
            className="flex items-center gap-4 rounded-sm border px-5 py-4 no-underline transition-colors group"
            style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'inherit' }}
          >
            <span className="text-xl w-8 text-center flex-shrink-0">⚙️</span>
            <span className="flex-1">
              <span className="block font-medium text-sm" style={{ color: '#e8e8e8' }}>Impostazioni</span>
              <span className="block text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                Soglia minima prenotazioni e parametri globali
              </span>
            </span>
            <span className="font-mono text-sm transition-transform group-hover:translate-x-0.5"
              style={{ color: 'var(--border)' }}>→</span>
          </Link>
        </nav>

      </div>
    </div>
  )
}
