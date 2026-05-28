import Link from 'next/link'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader, MasterBadge } from '@/components/ui/page-header'
import { supabaseAdmin } from '@/lib/supabase'
import { markExpiredShuttlesDone } from '@/lib/data'
import { MasterNavetteList } from '@/components/navette/master-navette-list'

const ACTIVE_STATUSES = ['draft', 'confirmed', 'full']
const HISTORY_STATUSES = ['done', 'cancelled']

export default async function MasterNavettePage() {
  await markExpiredShuttlesDone()

  const { data: shuttles } = await supabaseAdmin
    .from('shuttles')
    .select('id, status, departure_time, max_seats, available_seats')
    .order('departure_time', { ascending: true })

  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
  const cutoff = twoDaysAgo.toISOString()

  const active  = (shuttles ?? []).filter(s => ACTIVE_STATUSES.includes(s.status))
  const storico = (shuttles ?? []).filter(s => HISTORY_STATUSES.includes(s.status) && s.departure_time >= cutoff).reverse()

  return (
    <PageLayout>
      <PageHeader backHref="/" right={<MasterBadge />} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Navette</h1>
        <Link
          href="/master/navette/nuova"
          className="rounded-sm border px-3 py-1.5 font-mono text-xs uppercase tracking-wide no-underline transition-colors hover:border-[--red] hover:text-[--red] active:scale-95"
          style={{ borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
        >
          + Nuova
        </Link>
      </div>

      <MasterNavetteList initialActive={active} initialStorico={storico} />
    </PageLayout>
  )
}
