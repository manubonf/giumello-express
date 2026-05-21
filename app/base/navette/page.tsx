import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { SubmitButton } from '@/components/ui/submit-button'
import { logout } from '@/app/login/actions'
import { getCurrentUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import { markExpiredShuttlesDone } from '@/lib/data'
import { NavetteList } from '@/components/navette/navette-list'

const ACTIVE_STATUSES  = ['draft', 'confirmed', 'full']
const HISTORY_STATUSES = ['done', 'cancelled']

export default async function NavettePage() {
  const { user, profile } = await getCurrentUser()

  await markExpiredShuttlesDone()

  const supabase = await createSupabaseServerClient()
  const [{ data: shuttles }, { data: participations }] = await Promise.all([
    supabase
      .from('shuttles')
      .select('id, status, departure_time, max_seats, available_seats')
      .order('departure_time', { ascending: true }),
    supabaseAdmin
      .from('booking_participants')
      .select('booking_id')
      .eq('user_id', user.id)
      .eq('is_guest', false),
  ])

  const bookingIds = participations?.map(p => p.booking_id) ?? []
  const { data: myBookings } = bookingIds.length
    ? await supabaseAdmin.from('bookings').select('shuttle_id').in('id', bookingIds)
    : { data: [] as { shuttle_id: string }[] }
  const bookedIds = [...new Set(myBookings?.map(b => b.shuttle_id) ?? [])]

  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const cutoff = oneWeekAgo.toISOString()

  const active  = (shuttles ?? []).filter(s => ACTIVE_STATUSES.includes(s.status))
  const storico = (shuttles ?? []).filter(s => HISTORY_STATUSES.includes(s.status) && s.departure_time >= cutoff).reverse()

  return (
    <PageLayout>
      <PageHeader
        backHref="/"
        right={
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-mono text-xs"
              style={{ color: 'var(--text-muted)' }}>
              {profile?.username ?? '—'}
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
        }
      />

      <h1 className="text-xl font-semibold mb-8">Navette disponibili</h1>

      <NavetteList initialActive={active} initialStorico={storico} bookedIds={bookedIds} />
    </PageLayout>
  )
}
