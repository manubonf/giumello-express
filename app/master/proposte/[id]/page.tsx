import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NavetteLogo } from '@/components/ui/navettelogo'
import { SubmitButton } from '@/components/ui/submit-button'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { supabaseAdmin } from '@/lib/supabase'
import { acceptProposal, rejectProposal } from '@/app/master/proposte/actions'

function formatDatetimeFull(iso: string) {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

function toLocalDatetimeValue(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between py-3"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <span className="font-mono text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span className="text-sm font-medium" style={{ color: '#e8e8e8' }}>{value}</span>
    </div>
  )
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

  // Se accepted, cerca la navetta collegata
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
            <Link href="/master/proposte" className="font-mono text-sm no-underline"
              style={{ color: 'var(--text-muted)' }}>←</Link>
            <NavetteLogo height={24} />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest rounded-sm border px-1.5 py-0.5"
            style={{ color: 'var(--red)', borderColor: 'var(--red-border)' }}>
            Master
          </span>
        </header>

        <h1 className="text-xl font-semibold mb-8">Proposta</h1>

        {error && (
          <p className="rounded-sm border px-4 py-3 font-mono text-sm mb-6"
            style={{ borderColor: 'var(--red-border)', color: 'var(--red)', background: 'var(--red-muted)' }}>
            {ERROR_MSG[error] ?? 'Errore sconosciuto.'}
          </p>
        )}

        {/* Dettagli proposta */}
        <div className="rounded-sm border mb-8" style={{ borderColor: 'var(--border)' }}>
          <div className="px-4">
            <Row label="Proposta da" value={proposerProfile?.username ?? '—'} />
            <Row label="Data proposta" value={formatDatetimeFull(proposal.departure_time)} />
            {proposal.notes && <Row label="Note" value={proposal.notes} />}
            <Row label="Inviata il" value={new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(proposal.created_at))} />
          </div>
        </div>

        {/* Navetta collegata (se accettata) */}
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

        {/* Azioni — solo se pending */}
        {isPending && (
          <div className="flex flex-col gap-8">

            {/* Form accetta — crea navetta */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-4"
                style={{ color: 'var(--text-muted)' }}>
                Accetta — crea navetta in bozza
              </p>
              <form action={acceptProposal} className="flex flex-col gap-4">
                <input type="hidden" name="proposal_id" value={proposal.id} />

                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-xs uppercase tracking-wide"
                    style={{ color: 'var(--text-muted)' }}>
                    Data e ora partenza
                  </label>
                  <DateTimePicker
                    name="departure_time"
                    required
                    defaultValue={toLocalDatetimeValue(proposal.departure_time)}
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className="font-mono text-xs uppercase tracking-wide"
                      style={{ color: 'var(--text-muted)' }}>
                      Posti totali
                    </label>
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
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className="font-mono text-xs uppercase tracking-wide"
                      style={{ color: 'var(--text-muted)' }}>
                      Soglia min.
                      <span className="ml-1 normal-case" style={{ color: 'var(--text-dim)' }}>
                        (default: {defaultMinSeats})
                      </span>
                    </label>
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
                  </div>
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

            {/* Rifiuta */}
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

      </div>
    </div>
  )
}
