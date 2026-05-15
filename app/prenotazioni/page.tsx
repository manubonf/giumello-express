import Link from 'next/link'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge, StatusDot } from '@/components/ui/status-badge'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { formatShort } from '@/lib/date'

export default async function PrenotazioniPage() {
  const { user, profile } = await getCurrentUser()

  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('id, shuttle_id, created_at, shuttles!inner(id, departure_time, status)')
    .eq('booker_id', user.id)
    .order('created_at', { ascending: false })

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

  return (
    <PageLayout>
      <PageHeader
        backHref="/"
        right={
          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            {profile?.username}
          </span>
        }
      />

      <h1 className="text-xl font-semibold mb-8">Le mie prenotazioni</h1>

      {!bookings?.length ? (
        <p className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
          Nessuna prenotazione.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map(b => {
            const shuttle = b.shuttles as unknown as { id: string; departure_time: string; status: string }
            const participants = participantsByBooking[b.id] ?? []
            const isActive = shuttle.status !== 'done' && shuttle.status !== 'cancelled'

            return (
              <div
                key={b.id}
                className="rounded-sm border px-4 py-4"
                style={{
                  background: 'var(--bg-panel)',
                  borderColor: isActive ? 'var(--border)' : 'var(--border-subtle)',
                  opacity: shuttle.status === 'cancelled' ? 0.6 : 1,
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <StatusDot status={shuttle.status} />
                  <Link
                    href={`/navette/${shuttle.id}`}
                    className="font-medium text-sm no-underline hover:underline"
                    style={{ color: 'var(--text)' }}
                  >
                    {formatShort(shuttle.departure_time)}
                  </Link>
                  <StatusBadge status={shuttle.status} />
                </div>

                {participants.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {participants.map(p => (
                      <span key={p.id}
                        className="font-mono text-xs rounded-sm border px-1.5 py-0.5"
                        style={{ borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}>
                        {p.is_guest ? `${p.guest_label} (ospite)` : (p.profiles?.username ?? '—')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </PageLayout>
  )
}
