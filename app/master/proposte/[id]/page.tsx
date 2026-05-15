import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader, MasterBadge } from '@/components/ui/page-header'
import { SubmitButton } from '@/components/ui/submit-button'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { DetailRow } from '@/components/ui/detail-row'
import { ErrorAlert } from '@/components/ui/alert'
import { FormField } from '@/components/ui/form-field'
import { supabaseAdmin } from '@/lib/supabase'
import { acceptProposal, rejectProposal } from '@/app/master/proposte/actions'
import { formatFull, formatMediumTime } from '@/lib/date'

function toLocalDatetimeValue(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const ERROR_MSG: Record<string, string> = {
  'dati-non-validi':  'Controlla i dati inseriti.',
  'errore-creazione': 'Errore durante la creazione della navetta. Riprova.',
}

export default async function PropostaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams])

  const { data: proposal } = await supabaseAdmin
    .from('proposals')
    .select('id, departure_time, notes, status, created_at, proposer_id')
    .eq('id', id)
    .single()

  if (!proposal) notFound()

  const { data: proposerProfile } = await supabaseAdmin
    .from('profiles')
    .select('username')
    .eq('id', proposal.proposer_id)
    .maybeSingle()
  const isPending = proposal.status === 'pending'

  let linkedShuttleId: string | null = null
  if (proposal.status === 'accepted') {
    const { data: shuttle } = await supabaseAdmin
      .from('shuttles')
      .select('id')
      .eq('proposal_id', id)
      .single()
    linkedShuttleId = shuttle?.id ?? null
  }

  const { data: settings } = await supabaseAdmin
    .from('app_settings')
    .select('min_interest_threshold')
    .single()
  const defaultMinSeats = settings?.min_interest_threshold ?? 5

  return (
    <PageLayout>
      <PageHeader backHref="/master/proposte" right={<MasterBadge />} />

      <h1 className="text-xl font-semibold mb-8">Proposta</h1>

      {error && <ErrorAlert message={ERROR_MSG[error] ?? 'Errore sconosciuto.'} />}

      <div className="rounded-sm border mb-8" style={{ borderColor: 'var(--border)' }}>
        <div className="px-4">
          <DetailRow label="Proposta da" value={proposerProfile?.username ?? '—'} />
          <DetailRow label="Data proposta" value={formatFull(proposal.departure_time)} />
          {proposal.notes && <DetailRow label="Note" value={proposal.notes} />}
          <DetailRow label="Inviata il" value={formatMediumTime(proposal.created_at)} />
        </div>
      </div>

      {proposal.status === 'accepted' && linkedShuttleId && (
        <div className="mb-8">
          <Link
            href={`/master/navette/${linkedShuttleId}`}
            className="font-mono text-xs no-underline hover:underline"
            style={{ color: '#22c55e' }}
          >
            Vai alla navetta creata →
          </Link>
        </div>
      )}

      {isPending && (
        <div className="flex flex-col gap-8">

          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-4"
              style={{ color: 'var(--text-muted)' }}>
              Accetta — crea navetta in bozza
            </p>
            <form action={acceptProposal} className="flex flex-col gap-4">
              <input type="hidden" name="proposal_id" value={proposal.id} />

              <FormField label="Data e ora partenza">
                <DateTimePicker
                  name="departure_time"
                  required
                  defaultValue={toLocalDatetimeValue(proposal.departure_time)}
                />
              </FormField>

              <div className="flex gap-4">
                <FormField label="Posti totali" className="flex-1">
                  <input
                    type="number"
                    name="max_seats"
                    min={1}
                    required
                    placeholder="es. 20"
                    className="w-full rounded-sm border px-3 py-2.5 font-mono text-sm"
                    style={{
                      background: 'var(--bg-panel)',
                      borderColor: 'var(--border-muted)',
                      color: 'var(--text)',
                    }}
                  />
                </FormField>
                <FormField label={`Soglia min. (default: ${defaultMinSeats})`} className="flex-1">
                  <input
                    type="number"
                    name="min_seats"
                    min={1}
                    placeholder={String(defaultMinSeats)}
                    className="w-full rounded-sm border px-3 py-2.5 font-mono text-sm"
                    style={{
                      background: 'var(--bg-panel)',
                      borderColor: 'var(--border-muted)',
                      color: 'var(--text)',
                    }}
                  />
                </FormField>
              </div>

              <div>
                <SubmitButton
                  className="rounded-sm border px-5 py-2.5 font-mono text-xs uppercase tracking-wide transition-colors"
                  style={{ background: '#22c55e', borderColor: '#22c55e', color: 'white' }}
                >
                  Crea navetta in bozza
                </SubmitButton>
              </div>
            </form>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-4"
              style={{ color: 'var(--text-muted)' }}>
              Rifiuta proposta
            </p>
            <form action={rejectProposal}>
              <input type="hidden" name="proposal_id" value={proposal.id} />
              <SubmitButton
                className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors hover:border-[--red] hover:text-[--red]"
                style={{ background: 'none', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
              >
                Rifiuta
              </SubmitButton>
            </form>
          </div>

        </div>
      )}
    </PageLayout>
  )
}
