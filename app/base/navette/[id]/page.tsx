import { notFound } from 'next/navigation'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { getCurrentUser } from '@/lib/auth'
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
  const { user, profile } = await getCurrentUser()

  await markExpiredShuttlesDone(id)

  const supabase = await createSupabaseServerClient()

  const { data: shuttle } = await supabase
    .from('shuttles')
    .select('id, status, departure_time, max_seats, available_seats, min_seats')
    .eq('id', id)
    .single()

  if (!shuttle) notFound()

  const [{ data: myBooking }, { bookings: allBookings, profileById, participantsByBooking }, { data: otherProfiles }] =
    await Promise.all([
      supabaseAdmin.from('bookings').select('id').eq('shuttle_id', id).eq('booker_id', user.id).maybeSingle(),
      getBookingsWithParticipants(id),
      supabaseAdmin.from('profiles').select('id, username').neq('id', user.id).order('username'),
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
            {profile?.username}
          </span>
        }
      />
      <NavettaDetail
        shuttle={shuttle}
        myBookingId={myBooking?.id ?? null}
        userId={user.id}
        username={profile?.username ?? ''}
        initialBookings={initialBookings}
        allOtherProfiles={otherProfiles ?? []}
        error={error}
        ok={ok}
      />
    </PageLayout>
  )
}
