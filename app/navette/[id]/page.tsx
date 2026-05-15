import { notFound } from 'next/navigation'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { SubmitButton } from '@/components/ui/submit-button'
import { StatusBadge, StatusDot } from '@/components/ui/status-badge'
import { ErrorAlert, SuccessAlert } from '@/components/ui/alert'
import { getCurrentUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import { createBooking, cancelBooking } from '@/app/navette/actions'
import { formatFull } from '@/lib/date'

type Participant = {
  id: string
  booking_id: string
  is_guest: boolean
  guest_label: string | null
  profiles: { username: string } | null
}

const ERROR_MSG: Record<string, string> = {
  'posti-insufficienti':      'Posti insufficienti per il numero di partecipanti selezionati.',
  'navetta-non-prenotabile':  'Questa navetta non è più prenotabile.',
  'prenotazione-esistente':   'Hai già una prenotazione per questa navetta.',
  'errore-prenotazione':      'Errore durante la prenotazione. Riprova.',
  'non-autorizzato':          'Operazione non autorizzata.',
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

  // Tutte le prenotazioni per questa navetta, in ordine di arrivo
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
        .select('id, booking_id, is_guest, guest_label, profiles(username)')
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

  const canBook = !myBooking && shuttle.status !== 'full'
  const canCancel = !!myBooking && shuttle.status !== 'done' && shuttle.status !== 'cancelled'

  return (
    <PageLayout>
      <PageHeader
        backHref="/navette"
        right={
          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            {profile?.username}
          </span>
        }
      />

      <div className="flex items-center gap-3 mb-2">
        <StatusDot status={shuttle.status} size="md" />
        <StatusBadge status={shuttle.status} />
      </div>
      <h1 className="text-xl font-semibold mb-1">{formatFull(shuttle.departure_time)}</h1>
      <p className="font-mono text-sm mb-8" style={{ color: 'var(--text-dim)' }}>
        {shuttle.status === 'full'
          ? 'Posti esauriti'
          : `${shuttle.available_seats} / ${shuttle.max_seats} posti disponibili`}
      </p>

      {shuttle.status === 'draft' && (
        <p className="rounded-sm border px-4 py-3 font-mono text-sm mb-6"
          style={{ borderColor: '#88888840', color: '#888', background: '#88888810' }}>
          Navetta in bozza — non ancora garantita. Verrà confermata al raggiungimento di {shuttle.min_seats} prenotazioni.
        </p>
      )}

      {ok === '1' && <SuccessAlert message="Prenotazione confermata." />}
      {error && <ErrorAlert message={ERROR_MSG[error] ?? 'Errore sconosciuto.'} />}

      {/* Prenotazioni esistenti */}
      {allBookings && allBookings.length > 0 && (
        <div className="mb-8">
          <p className="font-mono text-[10px] uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-muted)' }}>
            Chi si è prenotato ({shuttle.max_seats - shuttle.available_seats})
          </p>
          <div className="flex flex-col gap-2">
            {allBookings.map((b, i) => {
              const isMe = b.booker_id === user.id
              const bookerUsername = profileById[b.booker_id]?.username ?? '—'
              const participants = participantsByBooking[b.id] ?? []
              return (
                <div
                  key={b.id}
                  className="rounded-sm border px-4 py-3"
                  style={{
                    borderColor: isMe ? 'var(--border)' : 'var(--border-subtle)',
                    background: isMe ? 'var(--bg-panel)' : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[10px] w-4 text-right flex-shrink-0"
                      style={{ color: 'var(--text-dim)' }}>
                      {i + 1}.
                    </span>
                    <span className="font-mono text-xs font-medium" style={{ color: isMe ? '#e8e8e8' : 'var(--text-muted)' }}>
                      {bookerUsername}
                      {isMe && <span className="ml-1.5" style={{ color: 'var(--text-dim)' }}>(tu)</span>}
                    </span>
                  </div>
                  {participants.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-6">
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
        </div>
      )}

      {/* Cancella prenotazione */}
      {myBooking && canCancel && (
        <form action={cancelBooking} className="mb-8">
          <input type="hidden" name="booking_id" value={myBooking.id} />
          <input type="hidden" name="shuttle_id" value={shuttle.id} />
          <SubmitButton
            className="rounded-sm border px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors hover:border-[--red] hover:text-[--red]"
            style={{ background: 'none', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
          >
            Cancella prenotazione
          </SubmitButton>
        </form>
      )}

      {canBook && (
        <form action={createBooking} className="flex flex-col gap-5">
          <input type="hidden" name="shuttle_id" value={shuttle.id} />

          <p className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: 'var(--text-muted)' }}>
            Nuova prenotazione
          </p>

          <div className="rounded-sm border px-4 py-3"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
            <p className="font-mono text-xs mb-1" style={{ color: 'var(--text-dim)' }}>
              Prenotato da
            </p>
            <span className="font-mono text-sm" style={{ color: '#e8e8e8' }}>
              {profile?.username} (tu)
            </span>
          </div>

          {otherProfiles && otherProfiles.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs uppercase tracking-wide"
                style={{ color: 'var(--text-muted)' }}>
                Altri partecipanti registrati
              </label>
              <div className="rounded-sm border px-4 py-3 flex flex-col gap-2"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
                {otherProfiles.map(p => (
                  <label key={p.id} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      name="participant_ids"
                      value={p.id}
                      className="w-3.5 h-3.5 accent-[--red]"
                    />
                    <span className="font-mono text-sm" style={{ color: '#e8e8e8' }}>
                      {p.username}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}>
              Ospiti
            </label>
            <textarea
              name="guests"
              rows={3}
              placeholder={'Mario Rossi\nGiulia Bianchi'}
              className="w-full rounded-sm border px-3 py-2.5 font-mono text-sm resize-none"
              style={{
                background: 'var(--bg-panel)',
                borderColor: 'var(--border-muted)',
                color: 'var(--text)',
              }}
            />
            <p className="font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>
              Un nome per riga. Ogni ospite occupa un posto.
            </p>
          </div>

          <div className="mt-1">
            <SubmitButton
              className="rounded-sm border px-5 py-2.5 font-mono text-xs uppercase tracking-wide transition-colors"
              style={{ background: 'var(--red)', borderColor: 'var(--red)', color: 'white' }}
            >
              Prenota
            </SubmitButton>
          </div>
        </form>
      )}

    </PageLayout>
  )
}
