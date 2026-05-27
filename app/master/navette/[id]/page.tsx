import { notFound } from 'next/navigation'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader, MasterBadge } from '@/components/ui/page-header'
import { supabaseAdmin } from '@/lib/supabase'
import { markExpiredShuttlesDone, getBookingsWithParticipants } from '@/lib/data'
import { MasterNavettaDetail } from '@/components/navette/master-navette-detail'

export default async function NavettaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; ok?: string }>
}) {
  const [{ id }, { error, ok }] = await Promise.all([params, searchParams])

  await markExpiredShuttlesDone(id)

  const [{ data: shuttle }, { bookings, profileById, participantsByBooking }] = await Promise.all([
    supabaseAdmin.from('shuttles').select('*').eq('id', id).single(),
    getBookingsWithParticipants(id),
  ])

  if (!shuttle) notFound()

  const initialBookings = bookings.map(b => ({
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
      <PageHeader backHref="/master/navette" right={<MasterBadge />} />
      <MasterNavettaDetail
        shuttle={shuttle}
        initialBookings={initialBookings}
        error={error}
        ok={ok}
      />
    </PageLayout>
  )
}
