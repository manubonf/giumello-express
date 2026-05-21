import { notFound } from 'next/navigation'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader, MasterBadge } from '@/components/ui/page-header'
import { supabaseAdmin } from '@/lib/supabase'
import { getBookingsWithParticipants } from '@/lib/data'
import { formatShort } from '@/lib/date'

export default async function PasseggeriPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [{ data: shuttle }, { bookings, profileById, participantsByBooking }] = await Promise.all([
    supabaseAdmin
      .from('shuttles')
      .select('id, departure_time, status, max_seats, available_seats')
      .eq('id', id)
      .single(),
    getBookingsWithParticipants(id),
  ])

  if (!shuttle) notFound()

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
                      style={{ borderColor: 'var(--border-muted)', color: 'var(--text)' }}>
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
