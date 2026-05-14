import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NavetteLogo } from '@/components/ui/navettelogo'
import { supabaseAdmin } from '@/lib/supabase'
import { confirmShuttle, markShuttleDone, cancelShuttle } from '@/app/master/navette/actions'

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
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
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
            <Link href="/master/navette" className="font-mono text-sm no-underline"
              style={{ color: 'var(--text-muted)' }}>←</Link>
            <NavetteLogo height={24} />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest rounded-sm border px-1.5 py-0.5"
            style={{ color: 'var(--red)', borderColor: 'var(--red-border)' }}>
            Master
          </span>
        </header>

        {/* Status badge */}
        <div className="flex items-center gap-3 mb-8">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: STATUS_COLOR[shuttle.status] ?? '#888' }}
          />
          <h1 className="text-xl font-semibold">
            {STATUS_LABEL[shuttle.status]}
          </h1>
        </div>

        {/* Details */}
        <div className="rounded-sm border mb-8" style={{ borderColor: 'var(--border)' }}>
          <div className="px-4">
            <Row label="Partenza" value={formatDatetime(shuttle.departure_time)} />
            <Row label="Posti disponibili" value={`${shuttle.available_seats} / ${shuttle.max_seats}`} />
            <Row label="Soglia conferma" value={`${shuttle.min_seats} prenotazioni`} />
            <Row label="Creata il" value={new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(shuttle.created_at))} />
          </div>
        </div>

        {/* Actions */}
        {(canConfirm || canMarkDone || canCancel) && (
          <div className="flex flex-wrap gap-3">
            {canConfirm && (
              <form action={confirmShuttle}>
                <input type="hidden" name="id" value={shuttle.id} />
                <button
                  type="submit"
                  className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors"
                  style={{ background: '#22c55e', borderColor: '#22c55e', color: 'white' }}
                >
                  Conferma
                </button>
              </form>
            )}
            {canMarkDone && (
              <form action={markShuttleDone}>
                <input type="hidden" name="id" value={shuttle.id} />
                <button
                  type="submit"
                  className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors"
                  style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
                >
                  Segna effettuata
                </button>
              </form>
            )}
            {canCancel && (
              <form action={cancelShuttle}>
                <input type="hidden" name="id" value={shuttle.id} />
                <button
                  type="submit"
                  className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors hover:border-[--red] hover:text-[--red]"
                  style={{ background: 'none', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
                >
                  Annulla navetta
                </button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
