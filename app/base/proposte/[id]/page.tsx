import { notFound, redirect } from 'next/navigation'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { SubmitButton } from '@/components/ui/submit-button'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { StatusBadge } from '@/components/ui/status-badge'
import { ErrorAlert, SuccessAlert } from '@/components/ui/alert'
import { FormField } from '@/components/ui/form-field'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { formatFull } from '@/lib/date'
import { updateProposal, deleteProposal } from './actions'


const ERROR_MSG: Record<string, string> = {
  'non-autorizzato':    'Non sei autorizzato a modificare questa proposta.',
  'non-modificabile':   'Questa proposta non può più essere modificata.',
  'dati-non-validi':    'Inserisci una data e orario validi.',
  'errore-salvataggio': 'Errore durante il salvataggio. Riprova.',
}

export default async function PropostaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; ok?: string }>
}) {
  const [{ id }, { error, ok }] = await Promise.all([params, searchParams])
  const { user, profile } = await getCurrentUser()

  const { data: proposal } = await supabaseAdmin
    .from('proposals')
    .select('id, departure_time, notes, status, created_at, proposer_id')
    .eq('id', id)
    .eq('proposer_id', user.id)
    .single()

  if (!proposal) redirect('/base/proposte')

  const isPending = proposal.status === 'pending'

  return (
    <PageLayout>
      <PageHeader
        backHref="/base/proposte"
        right={
          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            {profile?.username}
          </span>
        }
      />

      <h1 className="text-xl font-semibold mb-8">Proposta</h1>

      {ok === '1' && <SuccessAlert message="Proposta aggiornata." />}
      {error && <ErrorAlert message={ERROR_MSG[error] ?? 'Errore sconosciuto.'} />}

      {!isPending && (
        <div className="rounded-sm border px-4 py-3 mb-8 flex items-center justify-between gap-4"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
          <div className="flex-1 min-w-0">
            <span className="block font-medium text-sm" style={{ color: 'var(--text)' }}>
              {formatFull(proposal.departure_time)}
            </span>
            {proposal.notes && (
              <span className="block font-mono text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                {proposal.notes}
              </span>
            )}
          </div>
          <StatusBadge status={proposal.status} />
        </div>
      )}

      {isPending && (
        <>
          <form action={updateProposal} className="flex flex-col gap-5 mb-10">
            <input type="hidden" name="proposal_id" value={proposal.id} />

            <FormField label="Data e ora proposta">
              <DateTimePicker
                name="departure_time"
                required
                defaultValue={proposal.departure_time}
              />
            </FormField>

            <FormField label="Note" optional>
              <textarea
                name="notes"
                rows={3}
                defaultValue={proposal.notes ?? ''}
                placeholder="Eventuali note o motivazioni..."
                className="w-full rounded-sm border px-3 py-2.5 font-mono text-sm resize-none"
                style={{
                  background: 'var(--bg-panel)',
                  borderColor: 'var(--border-muted)',
                  color: 'var(--text)',
                }}
              />
            </FormField>

            <div className="mt-2">
              <SubmitButton
                className="rounded-sm border px-5 py-2.5 font-mono text-xs uppercase tracking-wide transition-colors"
                style={{ background: 'var(--red)', borderColor: 'var(--red)', color: 'white' }}
              >
                Salva modifiche
              </SubmitButton>
            </div>
          </form>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-3"
              style={{ color: 'var(--text-muted)' }}>
              Cancella proposta
            </p>
            <form action={deleteProposal}>
              <input type="hidden" name="proposal_id" value={proposal.id} />
              <SubmitButton
                className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors hover:border-[--red] hover:text-[--red]"
                style={{ background: 'none', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
              >
                Cancella
              </SubmitButton>
            </form>
          </div>
        </>
      )}
    </PageLayout>
  )
}
