import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader, MasterBadge } from '@/components/ui/page-header'
import { NotifToggle } from '@/components/ui/notif-toggle'
import { PushSubscribe } from '@/components/ui/push-subscribe'
import { SubmitButton } from '@/components/ui/submit-button'
import { getMasterUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { updateMasterNotifPref } from './actions'
import { logout } from '@/app/login/actions'

export default async function ImpostazioniPage() {
  const user = await getMasterUser()

  const { data: prefs } = await supabaseAdmin
    .from('profiles')
    .select('notif_m1, notif_m2, notif_m3, notif_m4, notif_m5, notif_m6')
    .eq('id', user.id)
    .single()

  const p = prefs ?? {
    notif_m1: true, notif_m2: true, notif_m3: true,
    notif_m4: true, notif_m5: true, notif_m6: true,
  }

  const divider = <div className="border-t" style={{ borderColor: 'var(--border-subtle)' }} />

  return (
    <PageLayout>
      <PageHeader backHref="/" right={<MasterBadge />} />

      <h1 className="text-xl font-semibold mb-8">Impostazioni</h1>

      <p className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
        Questo dispositivo
      </p>

      <div className="rounded-sm border flex items-center justify-between px-4 py-3 mb-8" style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
        <span className="text-sm" style={{ color: 'var(--text)' }}>Notifiche push</span>
        <PushSubscribe />
      </div>

      <p className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
        Notifiche push
      </p>

      <div className="rounded-sm border" style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
        <div className="px-4">
          <NotifToggle
            label="Nuova proposta ricevuta"
            enabled={p.notif_m1}
            action={updateMasterNotifPref.bind(null, 'notif_m1')}
          />
        </div>
        {divider}
        <div className="px-4">
          <NotifToggle
            label="Nuova prenotazione su una navetta"
            enabled={p.notif_m2}
            action={updateMasterNotifPref.bind(null, 'notif_m2')}
          />
        </div>
        {divider}
        <div className="px-4">
          <NotifToggle
            label="Prenotazione modificata su una navetta"
            enabled={p.notif_m3}
            action={updateMasterNotifPref.bind(null, 'notif_m3')}
          />
        </div>
        {divider}
        <div className="px-4">
          <NotifToggle
            label="Prenotazione cancellata su una navetta"
            enabled={p.notif_m4}
            action={updateMasterNotifPref.bind(null, 'notif_m4')}
          />
        </div>
        {divider}
        <div className="px-4">
          <NotifToggle
            label="Navetta confermata automaticamente"
            description="Una bozza ha raggiunto la soglia minima passeggeri"
            enabled={p.notif_m5}
            action={updateMasterNotifPref.bind(null, 'notif_m5')}
          />
        </div>
        {divider}
        <div className="px-4">
          <NotifToggle
            label="Navetta tornata in bozza — passeggeri insufficienti"
            description="Richiede tua valutazione: promuovere o aspettare"
            enabled={p.notif_m6}
            action={updateMasterNotifPref.bind(null, 'notif_m6')}
          />
        </div>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-widest mb-3 mt-8" style={{ color: 'var(--text-muted)' }}>
        Account
      </p>

      <form action={logout}>
        <SubmitButton
          className="w-full rounded-sm border px-4 py-3 text-sm text-left transition-colors"
          style={{ background: 'var(--red)', borderColor: 'var(--red)', color: 'white' }}
        >
          Esci dall&apos;account
        </SubmitButton>
      </form>
    </PageLayout>
  )
}
