import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NavetteLogo } from '@/components/ui/navettelogo'
import { supabaseAdmin } from '@/lib/supabase'

function formatDatetime(iso: string) {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

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

  const totalBooked = (max_seats: number, available: number) => max_seats - available
  const booked = totalBooked(shuttle.max_seats, shuttle.available_seats)

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: `
          linear-gradient(var(--red-muted) 1px, transparent 1px),
          linear-gradient(90deg, var(--red-muted) 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px',
      }}
    >
      <div className="max-w-xl mx-auto px-4 py-6 pb-12">

        <header className="flex items-center justify-between pb-6 mb-10"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3">
            <Link href={`/master/navette/${id}`} className="font-mono text-sm no-underline"
              style={{ color: 'var(--text-muted)' }}>←</Link>
            <NavetteLogo height={24} />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest rounded-sm border px-1.5 py-0.5"
            style={{ color: 'var(--red)', borderColor: 'var(--red-border)' }}>
            Master
          </span>
        </header>

        <div className="mb-8">
          <h1 className="text-xl font-semibold">Passeggeri</h1>
          <p className="font-mono text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
            {formatDatetime(shuttle.departure_time)} · {booked}/{shuttle.max_seats} posti
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

      </div>
    </div>
  )
}
