import Link from 'next/link'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader, MasterBadge } from '@/components/ui/page-header'
import { SubmitButton } from '@/components/ui/submit-button'
import { getCurrentUser } from '@/lib/auth'
import { logout } from '@/app/login/actions'
import { PushSubscribe } from '@/components/ui/push-subscribe'
import { supabaseAdmin } from '@/lib/supabase'

type NavItem = { href: string; icon: string; title: string; desc: string; badge?: number }

export default async function HomePage() {
  const { user, profile } = await getCurrentUser()
  const isMaster = profile?.role === 'master'

  const [{ count: shuttleCount }, { count: proposalCount }] = await Promise.all([
    supabaseAdmin
      .from('shuttles')
      .select('id', { count: 'exact', head: true })
      .in('status', ['draft', 'confirmed', 'full']),
    isMaster
      ? supabaseAdmin.from('proposals').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      : supabaseAdmin.from('proposals').select('id', { count: 'exact', head: true }).eq('proposer_id', user.id).eq('status', 'pending'),
  ])

  const navItems: NavItem[] = isMaster
    ? [
        { href: '/master/navette',      icon: '🚐', title: 'Navette',      desc: 'Crea e gestisci il ciclo di vita delle navette', badge: shuttleCount ?? 0 },
        { href: '/master/utenti',       icon: '👤', title: 'Utenti',       desc: 'Crea e rimuovi utenti base' },
        { href: '/master/proposte',     icon: '💡', title: 'Proposte',     desc: 'Valuta le proposte degli utenti',                badge: proposalCount ?? 0 },
        { href: '/master/impostazioni', icon: '⚙️', title: 'Impostazioni', desc: 'Soglia minima prenotazioni e parametri globali' },
      ]
    : [
        { href: '/base/navette',      icon: '🚐', title: 'Navette',      desc: 'Navette disponibili e prenotazioni', badge: shuttleCount ?? 0 },
        { href: '/base/proposte',     icon: '💡', title: 'Proposte',     desc: 'Proponi o unisciti a una navetta',   badge: proposalCount ?? 0 },
        { href: '/base/impostazioni', icon: '⚙️', title: 'Impostazioni', desc: 'Notifiche e preferenze personali' },
      ]

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
            className="flex items-center gap-4 rounded-sm border px-5 py-4 no-underline transition-colors active:scale-95 group"
            style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'inherit' }}
          >
            <span className="text-xl w-8 text-center flex-shrink-0">{item.icon}</span>
            <span className="flex-1">
              <span className="flex items-center gap-2">
                <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>{item.title}</span>
                {!!item.badge && (
                  <span className="rounded-full px-1.5 py-0.5 font-mono text-[10px] leading-none"
                    style={{ background: 'var(--red)', color: 'white' }}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </span>
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
