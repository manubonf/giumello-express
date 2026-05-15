import { notFound } from 'next/navigation'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader, MasterBadge } from '@/components/ui/page-header'
import { supabaseAdmin } from '@/lib/supabase'
import { formatShort } from '@/lib/date'

export default async function PasseggeriPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: shuttle } = await supabaseAdmin
    .from('shuttles')
    .select('id, departure_time, status, max_seats, available_seats')
    .eq('id', id)
    .single()

  if (!shuttle) notFound()

  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('id, booker_id, created_at')
    .eq('shuttle_id', id)
    .order('created_at', { ascending: true })

  const bookerIds = [...new Set(bookings?.map(b => b.booker_id) ?? [])]
  const { data: bookerProfiles } = bookerIds.length
    ? await supabaseAdmin.from('profiles').select('id, username').in('id', bookerIds)
    : { data: [] as { id: string; username: string }[] }
  const profileById = Object.fromEntries((bookerProfiles ?? []).map(p => [p.id, p]))

  const bookingIds = bookings?.map(b => b.id) ?? []

  const { data: allParticipants } = bookingIds.length
    ? await supabaseAdmin
        .from('booking_participants')
        .select('id, booking_id, is_guest, guest_label, profiles(username)')
        .in('booking_id', bookingIds)
    : { data: [] }

  const participantsByBooking = (allParticipants ?? []).reduce<
    Record<string, { id: string; is_guest: boolean; guest_label: string | null; profiles: { username: string } | null }[]>
  >((acc, p) => {
    if (!acc[p.booking_id]) acc[p.booking_id] = []
    acc[p.booking_id].push(p as unknown as { id: string; is_guest: boolean; guest_label: string | null; profiles: { username: string } | null })
    return acc
  }, {})

  const booked = shuttle.max_seats - shuttle.available_seats

  return (
    <PageLayout>
      <PageHeader backHref={`/master/navette/${id}`} right={<MasterBadge />} />

      <div className="mb-8">
        <h1 className="text-xl font-semibold">Passeggeri</h1>
        <p className="font-mono text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
          {formatShort(shuttle.departure_time)} · {booked}/{shuttle.max_seats} posti
        </p>
      </div>

      {!bookings?.length ? (
        <p className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
          Nessuna prenotazione.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map(b => {
            const bookerUsername = profileById[b.booker_id]?.username ?? '—'
            const participants = participantsByBooking[b.id] ?? []
            return (
              <div key={b.id} className="rounded-sm border px-4 py-3"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
                <p className="font-mono text-[10px] uppercase tracking-widest mb-2"
                  style={{ color: 'var(--text-muted)' }}>
                  Prenotato da {bookerUsername}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {participants.map(p => (
                    <span key={p.id}
                      className="font-mono text-xs rounded-sm border px-1.5 py-0.5"
                      style={{ borderColor: 'var(--border-muted)', color: '#e8e8e8' }}>
                      {p.is_guest ? `${p.guest_label} (ospite)` : (p.profiles?.username ?? '—')}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </PageLayout>
  )
}
