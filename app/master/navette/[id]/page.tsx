import { notFound } from 'next/navigation'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader, MasterBadge } from '@/components/ui/page-header'
import { SubmitButton } from '@/components/ui/submit-button'
import { StatusDot, STATUS_LABEL } from '@/components/ui/status-badge'
import { DetailRow } from '@/components/ui/detail-row'
import { supabaseAdmin } from '@/lib/supabase'
import { confirmShuttle, markShuttleDone, cancelShuttle } from '@/app/master/navette/actions'
import { formatFull, formatMediumTime } from '@/lib/date'

export default async function NavettaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: shuttle } = await supabaseAdmin
    .from('shuttles')
    .select('*')
    .eq('id', id)
    .single()

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
