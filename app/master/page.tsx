import Link from 'next/link'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader, MasterBadge } from '@/components/ui/page-header'
import { SubmitButton } from '@/components/ui/submit-button'
import { logout } from '@/app/login/actions'

export default function MasterPage() {
  return (
    <PageLayout>
      <PageHeader
        backHref="/"
        right={
          <div className="flex items-center gap-3">
            <MasterBadge />
            <form action={logout}>
              <SubmitButton
                className="rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors hover:border-[--red] hover:text-[--red]"
                style={{ background: 'none', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
              >
                Esci
              </SubmitButton>
            </form>
          </div>
        }
      />

      <h1 className="text-xl font-semibold mb-8">Pannello master</h1>

      <nav className="flex flex-col gap-3">
        {[
          { href: '/master/navette',      icon: '🚐', title: 'Navette',      desc: 'Crea e gestisci il ciclo di vita delle navette' },
          { href: '/master/utenti',       icon: '👤', title: 'Utenti',       desc: 'Crea e rimuovi utenti base' },
          { href: '/master/proposte',     icon: '💡', title: 'Proposte',     desc: 'Valuta le proposte degli utenti' },
          { href: '/master/impostazioni', icon: '⚙️', title: 'Impostazioni', desc: 'Soglia minima prenotazioni e parametri globali' },
        ].map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-4 rounded-sm border px-5 py-4 no-underline transition-colors group"
            style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'inherit' }}
          >
            <span className="text-xl w-8 text-center flex-shrink-0">{item.icon}</span>
            <span className="flex-1">
              <span className="block font-medium text-sm" style={{ color: '#e8e8e8' }}>{item.title}</span>
              <span className="block text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{item.desc}</span>
            </span>
            <span className="font-mono text-sm transition-transform group-hover:translate-x-0.5"
              style={{ color: 'var(--border)' }}>→</span>
          </Link>
        ))}
      </nav>
    </PageLayout>
  )
}
