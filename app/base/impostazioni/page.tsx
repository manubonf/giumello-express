import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { NotifToggle } from '@/components/ui/notif-toggle'
import { PushSubscribe } from '@/components/ui/push-subscribe'
import { SubmitButton } from '@/components/ui/submit-button'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { updateBaseNotifPref } from './actions'
import { logout } from '@/app/login/actions'

export default async function ImpostazioniPage() {
  const { user } = await getCurrentUser()

  const { data: prefs } = await supabaseAdmin
    .from('profiles')
    .select('notif_u1, notif_u2, notif_u3, notif_u4, notif_u5, notif_u6, notif_u7, notif_u8, notif_u9')
    .eq('id', user.id)
    .single()

  const p = prefs ?? {
    notif_u1: true, notif_u2: true, notif_u3: true, notif_u4: true, notif_u5: true,
    notif_u6: true, notif_u7: true, notif_u8: true, notif_u9: true,
  }

  const divider = <div className="border-t mx-0" style={{ borderColor: 'var(--border-subtle)' }} />

  return (
    <PageLayout>
      <PageHeader backHref="/" />

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
            label="Nuova proposta da un altro utente"
            enabled={p.notif_u1}
            action={updateBaseNotifPref.bind(null, 'notif_u1')}
          />
        </div>
        {divider}
        <div className="px-4">
          <NotifToggle
            label="Nuova navetta disponibile (non ancora confermata)"
            enabled={p.notif_u2}
            action={updateBaseNotifPref.bind(null, 'notif_u2')}
          />
        </div>
        {divider}
        <div className="px-4">
          <NotifToggle
            label="Nuova navetta confermata direttamente"
            enabled={p.notif_u3}
            action={updateBaseNotifPref.bind(null, 'notif_u3')}
          />
        </div>
        {divider}
        <div className="px-4">
          <NotifToggle
            label="Cambio di stato — tutte le navette"
            description="Conferma, completo, annullata"
            enabled={p.notif_u4}
            action={updateBaseNotifPref.bind(null, 'notif_u4')}
          />
        </div>
        {divider}
        <div className="px-4">
          <NotifToggle
            label="Cambio di stato — navette a cui sei prenotato"
            description="Solo navette con tua prenotazione attiva"
            enabled={p.notif_u5}
            action={updateBaseNotifPref.bind(null, 'notif_u5')}
          />
        </div>
        {divider}
        <div className="px-4">
          <NotifToggle
            label="Aggiornamento posti — tutte le navette"
            description="Frequenza potenzialmente alta in un gruppo attivo"
            enabled={p.notif_u6}
            action={updateBaseNotifPref.bind(null, 'notif_u6')}
          />
        </div>
        {divider}
        <div className="px-4">
          <NotifToggle
            label="Aggiornamento posti — navette a cui sei prenotato"
            enabled={p.notif_u7}
            action={updateBaseNotifPref.bind(null, 'notif_u7')}
          />
        </div>
        {divider}
        <div className="px-4">
          <NotifToggle
            label="Proposta rifiutata dal master"
            enabled={p.notif_u8}
            action={updateBaseNotifPref.bind(null, 'notif_u8')}
          />
        </div>
        {divider}
        <div className="px-4">
          <NotifToggle
            label="Navetta annullata (solo prenotate)"
            description="Ricevi notifica quando il master annulla una navetta su cui sei prenotato"
            enabled={p.notif_u9}
            action={updateBaseNotifPref.bind(null, 'notif_u9')}
          />
        </div>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-widest mb-3 mt-8" style={{ color: 'var(--text-muted)' }}>
        Account
      </p>

      <form action={logout}>
        <SubmitButton
          className="w-full rounded-sm border px-4 py-3 text-sm text-left transition-colors hover:border-[--red] hover:text-[--red]"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'var(--text-dim)' }}
        >
          Esci dall&apos;account
        </SubmitButton>
      </form>
    </PageLayout>
  )
}
