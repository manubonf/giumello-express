import Link from 'next/link'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { SubmitButton } from '@/components/ui/submit-button'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { ErrorAlert } from '@/components/ui/alert'
import { FormField } from '@/components/ui/form-field'
import { createProposal } from '@/app/base/proposte/actions'

const ERROR_MSG: Record<string, string> = {
  'dati-non-validi': 'Inserisci una data e orario validi.',
  'errore-creazione': 'Errore durante l\'invio. Riprova.',
}

export default async function NuovaPropostaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <PageLayout>
      <PageHeader backHref="/base/proposte" />

      <h1 className="text-xl font-semibold mb-8">Nuova proposta</h1>

      {error && <ErrorAlert message={ERROR_MSG[error] ?? 'Errore sconosciuto.'} />}

      <form action={createProposal} className="flex flex-col gap-5">

        <FormField label="Data e ora proposta">
          <DateTimePicker name="departure_time" required />
        </FormField>

        <FormField label="Note" optional>
          <textarea
            name="notes"
            rows={3}
            placeholder="Eventuali note o motivazioni per la proposta..."
            className="w-full rounded-sm border px-3 py-2.5 font-mono text-sm resize-none"
            style={{
              background: 'var(--bg-panel)',
              borderColor: 'var(--border-muted)',
              color: 'var(--text)',
            }}
          />
        </FormField>

        <div className="flex gap-3 mt-2">
          <SubmitButton
            className="rounded-sm border px-5 py-2.5 font-mono text-xs uppercase tracking-wide transition-colors"
            style={{ background: '#22c55e', borderColor: '#22c55e', color: 'white' }}
          >
            Invia proposta
          </SubmitButton>
          <Link
            href="/base/proposte"
            className="rounded-sm border px-5 py-2.5 font-mono text-xs uppercase tracking-wide no-underline transition-colors hover:border-[--red] hover:text-[--red] active:scale-95"
            style={{ borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
          >
            Annulla
          </Link>
        </div>

      </form>
    </PageLayout>
  )
}
