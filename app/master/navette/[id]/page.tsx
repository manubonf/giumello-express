import { notFound } from 'next/navigation'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader, MasterBadge } from '@/components/ui/page-header'
import { SubmitButton } from '@/components/ui/submit-button'
import { StatusDot, STATUS_LABEL } from '@/components/ui/status-badge'
import { DetailRow } from '@/components/ui/detail-row'
import { supabaseAdmin } from '@/lib/supabase'
import { markExpiredShuttlesDone, getBookingsWithParticipants } from '@/lib/data'
import { confirmShuttle, markShuttleDone, cancelShuttle } from '@/app/master/navette/actions'
import { formatFull, formatMediumTime } from '@/lib/date'

export default async function NavettaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  await markExpiredShuttlesDone(id)

  const [{ data: shuttle }, { bookings, profileById, participantsByBooking }] = await Promise.all([
    supabaseAdmin.from('shuttles').select('*').eq('id', id).single(),
    getBookingsWithParticipants(id),
  ])

  if (!shuttle) notFound()

  const canConfirm = shuttle.status === 'draft'
  const canMarkDone = shuttle.status === 'confirmed' || shuttle.status === 'full'
  const canCancel = shuttle.status !== 'done' && shuttle.status !== 'cancelled'

  return (
    <PageLayout>
      <PageHeader backHref="/master/navette" right={<MasterBadge />} />

      <div className="flex items-center gap-3 mb-8">
        <StatusDot status={shuttle.status} size="md" />
        <h1 className="text-xl font-semibold">
          {STATUS_LABEL[shuttle.status] ?? shuttle.status}
        </h1>
      </div>

      <div className="rounded-sm border mb-8" style={{ borderColor: 'var(--border)' }}>
        <div className="px-4">
          <DetailRow label="Partenza" value={formatFull(shuttle.departure_time)} />
          <DetailRow label="Posti disponibili" value={`${shuttle.available_seats} / ${shuttle.max_seats}`} />
          <DetailRow label="Soglia conferma" value={`${shuttle.min_seats} prenotazioni`} />
          <DetailRow label="Creata il" value={formatMediumTime(shuttle.created_at)} />
        </div>
      </div>

      {/* Lista prenotazioni */}
      <div className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest mb-3"
          style={{ color: 'var(--text-muted)' }}>
          Prenotazioni ({shuttle.max_seats - shuttle.available_seats} / {shuttle.max_seats})
        </p>
        {!bookings?.length ? (
          <p className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
            Nessuna prenotazione.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {bookings.map((b, i) => {
              const bookerUsername = profileById[b.booker_id]?.username ?? '—'
              const participants = participantsByBooking[b.id] ?? []
              return (
                <div key={b.id} className="rounded-sm border px-4 py-3"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[10px] w-4 text-right flex-shrink-0"
                      style={{ color: 'var(--text-dim)' }}>
                      {i + 1}.
                    </span>
                    <span className="font-mono text-xs font-medium" style={{ color: 'var(--text)' }}>
                      {bookerUsername}
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
        )}
      </div>

      {(canConfirm || canMarkDone || canCancel) && (
        <div className="flex flex-wrap gap-3">
          {canConfirm && (
            <form action={confirmShuttle}>
              <input type="hidden" name="id" value={shuttle.id} />
              <SubmitButton
                className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors"
                style={{ background: '#22c55e', borderColor: '#22c55e', color: 'white' }}
              >
                Conferma
              </SubmitButton>
            </form>
          )}
          {canMarkDone && (
            <form action={markShuttleDone}>
              <input type="hidden" name="id" value={shuttle.id} />
              <SubmitButton
                className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors"
                style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
              >
                Segna effettuata
              </SubmitButton>
            </form>
          )}
          {canCancel && (
            <form action={cancelShuttle}>
              <input type="hidden" name="id" value={shuttle.id} />
              <SubmitButton
                className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors hover:border-[--red] hover:text-[--red]"
                style={{ background: 'none', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
              >
                Annulla navetta
              </SubmitButton>
            </form>
          )}
        </div>
      )}
    </PageLayout>
  )
}
