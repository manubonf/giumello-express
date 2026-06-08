import { after } from 'next/server'
import { notFound, redirect } from 'next/navigation'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { getSessionFromHeaders } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import { markExpiredShuttlesDone, getBookingsWithParticipants } from '@/lib/data'
import { NavettaDetail } from '@/components/navette/navette-detail'

export default async function NavettaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; ok?: string }>
}) {
  const [{ id }, { error, ok }] = await Promise.all([params, searchParams])
  const { userId, username } = await getSessionFromHeaders()

  after(() => markExpiredShuttlesDone(id))

  const supabase = await createSupabaseServerClient()

  const { data: shuttle } = await supabase
    .from('shuttles')
    .select('id, status, departure_time, max_seats, available_seats, min_seats')
    .eq('id', id)
    .single()

  if (!shuttle) redirect('/base/navette')

  const [
    { bookings: allBookings, profileById, participantsByBooking },
    { count: ammonizioniCount },
  ] = await Promise.all([
    getBookingsWithParticipants(id),
    supabaseAdmin
      .from('ammonizioni')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
  ])

  const initialBookings = allBookings.map(b => ({
    id: b.id,
    booker_id: b.booker_id,
    bookerUsername: profileById[b.booker_id]?.username ?? '—',
    participants: (participantsByBooking[b.id] ?? []).map(p => ({
      id: p.id,
      is_guest: p.is_guest,
      guest_label: p.guest_label,
      user_id: p.user_id ?? null,
      username: p.is_guest ? null : (p.profiles?.username ?? null),
    })),
  }))

  return (
    <PageLayout>
      <PageHeader
        backHref="/base/navette"
        right={
          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            {username}
          </span>
        }
      />
      <NavettaDetail
        shuttle={shuttle}
        userId={userId}
        username={username}
        initialBookings={initialBookings}
        error={error}
        ok={ok}
        ammonizioniCount={ammonizioniCount ?? 0}
      />
    </PageLayout>
  )
}
