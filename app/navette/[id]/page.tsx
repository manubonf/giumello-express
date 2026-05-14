import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NavetteLogo } from '@/components/ui/navettelogo'
import { getCurrentUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import { createBooking, cancelBooking } from '@/app/navette/actions'

const STATUS_LABEL: Record<string, string> = {
  draft:     'Bozza',
  confirmed: 'Confermata',
  full:      'Completa',
}

const STATUS_COLOR: Record<string, string> = {
  draft:     '#888',
  confirmed: '#22c55e',
  full:      '#f59e0b',
}

const ERROR_MSG: Record<string, string> = {
  'posti-insufficienti':      'Posti insufficienti per il numero di partecipanti selezionati.',
  'navetta-non-prenotabile':  'Questa navetta non è più prenotabile.',
  'prenotazione-esistente':   'Hai già una prenotazione per questa navetta.',
  'errore-prenotazione':      'Errore durante la prenotazione. Riprova.',
  'non-autorizzato':          'Operazione non autorizzata.',
}

function formatDatetime(iso: string) {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
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

  // Prenotazione corrente dell'utente
  const { data: myBooking } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('shuttle_id', id)
    .eq('booker_id', user.id)
    .maybeSingle()

  // Partecipanti della prenotazione corrente
  let myParticipants: { id: string; is_guest: boolean; guest_label: string | null; profiles: { username: string } | null }[] = []
  if (myBooking) {
    const { data } = await supabaseAdmin
      .from('booking_participants')
      .select('id, is_guest, guest_label, profiles(username)')
      .eq('booking_id', myBooking.id)
    myParticipants = (data ?? []) as unknown as typeof myParticipants
  }

  // Lista utenti per la form (tutti tranne il corrente)
  const { data: otherProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id, username')
    .neq('id', user.id)
    .order('username')

  const canBook = !myBooking && shuttle.status !== 'full'
  const canCancel = !!myBooking && shuttle.status !== 'done' && shuttle.status !== 'cancelled'

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
            <Link href="/navette" className="font-mono text-sm no-underline"
              style={{ color: 'var(--text-muted)' }}>←</Link>
            <NavetteLogo height={24} />
          </div>
          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            {profile?.username}
          </span>
        </header>

        {/* Status + data */}
        <div className="flex items-center gap-3 mb-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: STATUS_COLOR[shuttle.status] ?? '#888' }} />
          <span className="font-mono text-xs rounded-sm px-1.5 py-0.5"
            style={{
              color: STATUS_COLOR[shuttle.status] ?? '#888',
              background: `${STATUS_COLOR[shuttle.status] ?? '#888'}18`,
              border: `1px solid ${STATUS_COLOR[shuttle.status] ?? '#888'}40`,
            }}>
            {STATUS_LABEL[shuttle.status] ?? shuttle.status}
          </span>
        </div>
        <h1 className="text-xl font-semibold mb-1">{formatDatetime(shuttle.departure_time)}</h1>
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

        {/* Banner successo */}
        {ok === '1' && (
          <p className="rounded-sm border px-4 py-3 font-mono text-sm mb-6"
            style={{ borderColor: '#22c55e40', color: '#22c55e', background: '#22c55e10' }}>
            Prenotazione confermata.
          </p>
        )}

        {/* Banner errore */}
        {error && (
          <p className="rounded-sm border px-4 py-3 font-mono text-sm mb-6"
            style={{ borderColor: 'var(--red-border)', color: 'var(--red)', background: 'var(--red-muted)' }}>
            {ERROR_MSG[error] ?? 'Errore sconosciuto.'}
          </p>
        )}

        {/* Prenotazione esistente */}
        {myBooking && (
          <div className="rounded-sm border px-4 py-4 mb-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-3"
              style={{ color: 'var(--text-muted)' }}>
              La tua prenotazione
            </p>
            <div className="flex flex-col gap-1.5">
              {myParticipants.map(p => (
                <span key={p.id} className="font-mono text-sm" style={{ color: '#e8e8e8' }}>
                  {p.is_guest ? `${p.guest_label} (ospite)` : (p.profiles?.username ?? '—')}
                </span>
              ))}
            </div>
            {canCancel && (
              <form action={cancelBooking} className="mt-4">
                <input type="hidden" name="booking_id" value={myBooking.id} />
                <input type="hidden" name="shuttle_id" value={shuttle.id} />
                <button
                  type="submit"
                  className="rounded-sm border px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors hover:border-[--red] hover:text-[--red]"
                  style={{ background: 'none', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
                >
                  Cancella prenotazione
                </button>
              </form>
            )}
          </div>
        )}

        {/* Form prenotazione */}
        {canBook && (
          <form action={createBooking} className="flex flex-col gap-5">
            <input type="hidden" name="shuttle_id" value={shuttle.id} />

            <p className="font-mono text-[10px] uppercase tracking-widest"
              style={{ color: 'var(--text-muted)' }}>
              Nuova prenotazione
            </p>

            {/* Il booker è sempre incluso */}
            <div className="rounded-sm border px-4 py-3"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
              <p className="font-mono text-xs mb-1" style={{ color: 'var(--text-dim)' }}>
                Prenotato da
              </p>
              <span className="font-mono text-sm" style={{ color: '#e8e8e8' }}>
                {profile?.username} (tu)
              </span>
            </div>

            {/* Altri utenti registrati */}
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

            {/* Ospiti */}
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
              <button
                type="submit"
                className="rounded-sm border px-5 py-2.5 font-mono text-xs uppercase tracking-wide transition-colors"
                style={{ background: 'var(--red)', borderColor: 'var(--red)', color: 'white' }}
              >
                Prenota
              </button>
            </div>
          </form>
        )}

        {/* Link master passeggeri */}
        {profile?.role === 'master' && (
          <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <Link
              href={`/master/navette/${shuttle.id}/passeggeri`}
              className="font-mono text-xs no-underline hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              Lista passeggeri →
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
