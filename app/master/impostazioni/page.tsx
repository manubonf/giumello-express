import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader, MasterBadge } from '@/components/ui/page-header'
import { SubmitButton } from '@/components/ui/submit-button'
import { ErrorAlert, SuccessAlert } from '@/components/ui/alert'
import { FormField } from '@/components/ui/form-field'
import { supabaseAdmin } from '@/lib/supabase'
import { updateSettings } from '@/app/master/impostazioni/actions'

const ERROR_MSG: Record<string, string> = {
  'valore-non-valido': 'Inserisci un numero intero maggiore di zero.',
  'errore-salvataggio': 'Errore durante il salvataggio. Riprova.',
}

export default async function ImpostazioniPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>
}) {
  const { error, ok } = await searchParams

  const { data: settings } = await supabaseAdmin
    .from('app_settings')
    .select('min_interest_threshold, updated_at')
    .single()

  const current = settings?.min_interest_threshold ?? 5

  return (
    <PageLayout>
      <PageHeader backHref="/" right={<MasterBadge />} />

      <h1 className="text-xl font-semibold mb-8">Impostazioni</h1>

      {ok === '1' && <SuccessAlert message="Impostazioni salvate." />}
      {error && <ErrorAlert message={ERROR_MSG[error] ?? 'Errore sconosciuto.'} />}

      <form action={updateSettings} className="flex flex-col gap-5">
        <FormField
          label="Soglia minima prenotazioni"
          description="Numero minimo di prenotazioni affinché una navetta in bozza passi automaticamente a «Confermata». Questo valore è il default per le nuove navette; le navette già create non vengono modificate."
        >
          <input
            type="number"
            name="min_interest_threshold"
            min={1}
            required
            defaultValue={current}
            className="w-full rounded-sm border px-3 py-2.5 font-mono text-sm"
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
            Salva
          </SubmitButton>
        </div>
      </form>
    </PageLayout>
  )
}
