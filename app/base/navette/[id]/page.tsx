import { notFound } from 'next/navigation'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { getCurrentUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import { NavettaDetail } from '@/components/navette/navette-detail'

type Participant = {
  id: string
  booking_id: string
  is_guest: boolean
  guest_label: string | null
  user_id: string | null
  profiles: { username: string } | null
}

export default async function NavettaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; ok?: string }>
}) {
  const [{ id }, { error, ok }] = await Promise.all([params, searchParams])
  const { user, profile } = await getCurrentUser()

  await supabaseAdmin
    .from('shuttles')
    .update({ status: 'done' })
    .in('status', ['confirmed', 'full'])
    .lt('departure_time', new Date().toISOString())
    .eq('id', id)

  const supabase = await createSupabaseServerClient()

  const { data: shuttle } = await supabase
    .from('shuttles')
    .select('id, status, departure_time, max_seats, available_seats, min_seats')
    .eq('id', id)
    .single()

  if (!shuttle) notFound()

  const { data: myBooking } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('shuttle_id', id)
    .eq('booker_id', user.id)
    .maybeSingle()

  const { data: allBookings } = await supabaseAdmin
    .from('bookings')
    .select('id, booker_id, created_at')
    .eq('shuttle_id', id)
    .order('created_at', { ascending: true })

  const bookerIds = [...new Set(allBookings?.map(b => b.booker_id) ?? [])]
  const { data: bookerProfiles } = bookerIds.length
    ? await supabaseAdmin.from('profiles').select('id, username').in('id', bookerIds)
    : { data: [] as { id: string; username: string }[] }
  const profileById = Object.fromEntries((bookerProfiles ?? []).map(p => [p.id, p]))

  const bookingIds = allBookings?.map(b => b.id) ?? []
  const { data: allParticipants } = bookingIds.length
    ? await supabaseAdmin
        .from('booking_participants')
        .select('id, booking_id, is_guest, guest_label, user_id, profiles(username)')
        .in('booking_id', bookingIds)
    : { data: [] }

  const participantsByBooking = (allParticipants ?? []).reduce<Record<string, Participant[]>>((acc, p) => {
    if (!acc[p.booking_id]) acc[p.booking_id] = []
    acc[p.booking_id].push(p as unknown as Participant)
    return acc
  }, {})

  const { data: otherProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id, username')
    .neq('id', user.id)
    .order('username')

  const initialBookings = (allBookings ?? []).map(b => ({
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
