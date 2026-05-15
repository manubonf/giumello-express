import { PageLayout } from '@/components/ui/page-layout'
import { NavetteLogo } from '@/components/ui/navettelogo'
import { SubmitButton } from '@/components/ui/submit-button'
import { getCurrentUser } from '@/lib/auth'
import { logout } from '@/app/login/actions'
import { PushSubscribe } from '@/components/push-subscribe'

const NAV_ITEMS = [
  { href: '/navette',      icon: '🚐', title: 'Navette',            desc: 'Navette disponibili e prenotazioni' },
  { href: '/proposte',     icon: '💡', title: 'Proposte',           desc: 'Proponi o unisciti a una navetta'   },
  { href: '/prenotazioni', icon: '📋', title: 'Le mie prenotazioni', desc: 'Attive e storico'                  },
]

export default async function HomePage() {
  const { profile } = await getCurrentUser()
  const isMaster = profile?.role === 'master'

  return (
    <PageLayout>
      <header className="flex items-center justify-between pb-6 mb-10"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <NavetteLogo height={28} />
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-mono text-xs"
            style={{ color: 'var(--text-muted)' }}>
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: isMaster ? 'var(--red)' : 'var(--text-dim)' }}
            />
            {profile?.username ?? '—'}
          </span>
          <PushSubscribe />
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

      <section className="flex items-baseline gap-3 mb-8">
        <h1 className="text-2xl font-semibold">
          Ciao, <span style={{ color: 'var(--red)' }}>{profile?.username}</span>
        </h1>
        {isMaster && (
          <span
            className="font-mono text-[10px] uppercase tracking-widest whitespace-nowrap rounded-sm border px-1.5 py-0.5"
            style={{ color: 'var(--red)', borderColor: 'var(--red-border)' }}
          >
            Master
          </span>
        )}
      </section>

      <nav className="flex flex-col gap-3">
        {NAV_ITEMS.map(item => (
          <a
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
          </a>
        ))}

        {isMaster && (
          <a
            href="/master"
            className="flex items-center gap-4 rounded-sm border px-5 py-4 no-underline transition-colors group"
            style={{ background: 'var(--bg-panel)', borderColor: 'var(--red-border)', color: 'inherit' }}
          >
            <span className="text-xl w-8 text-center flex-shrink-0">⚙️</span>
            <span className="flex-1">
              <span className="block font-medium text-sm" style={{ color: 'var(--text)' }}>Pannello master</span>
              <span className="block text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>Gestione navette, utenti, impostazioni</span>
            </span>
            <span className="font-mono text-sm transition-transform group-hover:translate-x-0.5"
              style={{ color: 'var(--border)' }}>→</span>
          </a>
        )}
      </nav>
    </PageLayout>
  )
}
