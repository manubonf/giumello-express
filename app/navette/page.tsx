import Link from 'next/link'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { SubmitButton } from '@/components/ui/submit-button'
import { StatusBadge, StatusDot } from '@/components/ui/status-badge'
import { logout } from '@/app/login/actions'
import { getCurrentUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { formatShort } from '@/lib/date'

export default async function NavettePage() {
  const { profile } = await getCurrentUser()

  const supabase = await createSupabaseServerClient()
  const { data: shuttles } = await supabase
    .from('shuttles')
    .select('id, status, departure_time, max_seats, available_seats')
    .in('status', ['draft', 'confirmed', 'full'])
    .order('departure_time', { ascending: true })

  return (
    <PageLayout>
      <PageHeader
        backHref="/"
        right={
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-mono text-xs"
              style={{ color: 'var(--text-muted)' }}>
              {profile?.username ?? '—'}
            </span>
            <form action={logout}>
              <SubmitButton
                className="rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors hover:border-[--red] hover:text-[--red]"
                style={{ background: 'none', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
              >
                Esci
              </SubmitButton>
            </form>
          </div>
        }
      />

      <h1 className="text-xl font-semibold mb-8">Navette disponibili</h1>

      {!shuttles?.length ? (
        <p className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
          Nessuna navetta disponibile al momento.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {shuttles.map(s => (
            <Link
              key={s.id}
              href={`/navette/${s.id}`}
              className="flex items-center gap-4 rounded-sm border px-4 py-4 no-underline transition-colors group"
              style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'inherit' }}
            >
              <StatusDot status={s.status} />
              <span className="flex-1 min-w-0">
                <span className="block font-medium text-sm" style={{ color: 'var(--text)' }}>
                  {formatShort(s.departure_time)}
                </span>
                <span className="flex items-center gap-2 mt-1">
                  <StatusBadge status={s.status} />
                  {s.status === 'full' ? (
                    <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
                      Posti esauriti
                    </span>
                  ) : (
                    <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
                      {s.available_seats} posti disponibili
                    </span>
                  )}
                </span>
                {s.status === 'draft' && (
                  <p className="font-mono text-[11px] mt-1.5" style={{ color: 'var(--text-dim)' }}>
                    Navetta in bozza — non ancora garantita
                  </p>
                )}
              </span>
              <span className="font-mono text-sm transition-transform group-hover:translate-x-0.5"
                style={{ color: 'var(--border)' }}>→</span>
            </Link>
          ))}
        </div>
      )}
    </PageLayout>
  )
}
