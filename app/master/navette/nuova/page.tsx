import Link from 'next/link'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader, MasterBadge } from '@/components/ui/page-header'
import { SubmitButton } from '@/components/ui/submit-button'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { ErrorAlert } from '@/components/ui/alert'
import { FormField } from '@/components/ui/form-field'
import { createShuttle } from '@/app/master/navette/actions'

const ERROR_MSG: Record<string, string> = {
  'dati-non-validi':  'Controlla i dati inseriti.',
  'errore-creazione': 'Errore durante la creazione. Riprova.',
}

export default async function NuovaNavettePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <PageLayout>
      <PageHeader backHref="/master/navette" right={<MasterBadge />} />

      <h1 className="text-xl font-semibold mb-8">Nuova navetta</h1>

      {error && <ErrorAlert message={ERROR_MSG[error] ?? 'Errore sconosciuto.'} />}

      <form action={createShuttle} className="flex flex-col gap-5">

        <FormField label="Data e ora partenza">
          <DateTimePicker name="departure_time" required />
        </FormField>

        <FormField label="Posti totali">
          <input
            type="number"
            name="max_seats"
            min={1}
            required
            placeholder="es. 10"
            className="w-full rounded-sm border px-3 py-2.5 font-mono text-sm"
            style={{
              background: 'var(--bg-panel)',
              borderColor: 'var(--border-muted)',
              color: 'var(--text)',
            }}
          />
        </FormField>

        <FormField
          label={`Soglia minima prenotazioni`}
          description="Lascia vuoto oppure 0 per creare navetta «Confermata». Altrimenti la navetta passa a «Confermata» al raggiungimento della soglia indicata"
        >
          <input
            type="number"
            name="min_seats"
            min={0}
            placeholder="Default Confermata"
            className="w-full rounded-sm border px-3 py-2.5 font-mono text-sm"
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
            Crea navetta
          </SubmitButton>
          <Link
            href="/master/navette"
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
