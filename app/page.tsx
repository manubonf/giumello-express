import Link from 'next/link'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader, MasterBadge } from '@/components/ui/page-header'
import { SubmitButton } from '@/components/ui/submit-button'
import { getCurrentUser } from '@/lib/auth'
import { logout } from '@/app/login/actions'
import { PushSubscribe } from '@/components/push-subscribe'

const BASE_NAV = [
  { href: '/base/navette',      icon: '🚐', title: 'Navette',      desc: 'Navette disponibili e prenotazioni' },
  { href: '/base/proposte',     icon: '💡', title: 'Proposte',     desc: 'Proponi o unisciti a una navetta'   },
  { href: '/base/impostazioni', icon: '⚙️', title: 'Impostazioni', desc: 'Notifiche e preferenze personali'   },
]

const MASTER_NAV = [
  { href: '/master/navette',      icon: '🚐', title: 'Navette',      desc: 'Crea e gestisci il ciclo di vita delle navette' },
  { href: '/master/utenti',       icon: '👤', title: 'Utenti',       desc: 'Crea e rimuovi utenti base'                     },
  { href: '/master/proposte',     icon: '💡', title: 'Proposte',     desc: 'Valuta le proposte degli utenti'                },
  { href: '/master/impostazioni', icon: '⚙️', title: 'Impostazioni', desc: 'Soglia minima prenotazioni e parametri globali' },
]

export default async function HomePage() {
  const { profile } = await getCurrentUser()
  const isMaster = profile?.role === 'master'
  const navItems = isMaster ? MASTER_NAV : BASE_NAV

  return (
    <PageLayout>
      <PageHeader
        logoHeight={28}
        right={
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: isMaster ? 'var(--red)' : 'var(--text-dim)' }}
              />
              {profile?.username ?? '—'}
            </span>
            {isMaster ? <MasterBadge /> : <PushSubscribe />}
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

      <h1 className="text-2xl font-semibold mb-8">
        {isMaster ? 'Pannello master' : <>Ciao, <span style={{ color: 'var(--red)' }}>{profile?.username}</span></>}
      </h1>

      <nav className="flex flex-col gap-3">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-4 rounded-sm border px-5 py-4 no-underline transition-colors group"
            style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'inherit' }}
          >
            <span className="text-xl w-8 text-center flex-shrink-0">{item.icon}</span>
            <span className="flex-1">
              <span className="block font-medium text-sm" style={{ color: 'var(--text)' }}>{item.title}</span>
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
