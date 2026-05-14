import Link from 'next/link'
import { NavetteLogo } from '@/components/ui/navettelogo'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const STATUS_LABEL: Record<string, string> = {
  draft:     'Bozza',
  confirmed: 'Confermata',
  full:      'Completa',
  done:      'Effettuata',
  cancelled: 'Cancellata',
}

const STATUS_COLOR: Record<string, string> = {
  draft:     '#888',
  confirmed: '#22c55e',
  full:      '#f59e0b',
  done:      '#555',
  cancelled: '#e01110',
}

function formatDatetime(iso: string) {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

export default async function PrenotazioniPage() {
  const { user, profile } = await getCurrentUser()

  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('id, shuttle_id, created_at, shuttles!inner(id, departure_time, status)')
    .eq('booker_id', user.id)
    .order('created_at', { ascending: false })

  const bookingIds = bookings?.map(b => b.id) ?? []

  // Partecipanti di tutte le prenotazioni in un'unica query
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
            <Link href="/" className="font-mono text-sm no-underline"
              style={{ color: 'var(--text-muted)' }}>←</Link>
            <NavetteLogo height={24} />
          </div>
          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            {profile?.username}
          </span>
        </header>

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
                  {/* Header navetta */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: STATUS_COLOR[shuttle.status] ?? '#888' }} />
                    <Link
                      href={`/navette/${shuttle.id}`}
                      className="font-medium text-sm no-underline hover:underline"
                      style={{ color: '#e8e8e8' }}
                    >
                      {formatDatetime(shuttle.departure_time)}
                    </Link>
                    <span className="font-mono text-xs rounded-sm px-1.5 py-0.5 ml-1"
                      style={{
                        color: STATUS_COLOR[shuttle.status] ?? '#888',
                        background: `${STATUS_COLOR[shuttle.status] ?? '#888'}18`,
                        border: `1px solid ${STATUS_COLOR[shuttle.status] ?? '#888'}40`,
                      }}>
                      {STATUS_LABEL[shuttle.status]}
                    </span>
                  </div>

                  {/* Partecipanti */}
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

      </div>
    </div>
  )
}
