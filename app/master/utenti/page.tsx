import Link from 'next/link'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader, MasterBadge } from '@/components/ui/page-header'
import { supabaseAdmin } from '@/lib/supabase'
import { UtentiList } from './_components/utenti-list'

export const dynamic = 'force-dynamic'

export default async function MasterUtentiPage() {
  const [{ data: utenti }, { data: allAmmonizioni }, { count: contautenti}] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, username, created_at')
      .eq('role', 'base')
      .order('username', { ascending: true }),
    supabaseAdmin
      .from('ammonizioni')
      .select('user_id'),
    supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'base')
  ])

  const ammonizioniCount = (allAmmonizioni ?? []).reduce<Record<string, number>>((acc, a) => {
    acc[a.user_id] = (acc[a.user_id] ?? 0) + 1
    return acc
  }, {})

  const utentiWithCount = (utenti ?? []).map(u => ({
    ...u,
    ammonizioni: ammonizioniCount[u.id] ?? 0,
  }))

  return (
    <PageLayout>
      <PageHeader backHref="/" right={<MasterBadge />} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="leading-none" style={{ fontFamily: "var(--font-display)", fontSize: "3rem", fontWeight: 400, color: "var(--text)" }}>Utenti ({contautenti})</h1>
        <Link
          href="/master/utenti/nuovo"
          className="rounded-xl border px-3 py-1.5 font-mono text-xs uppercase tracking-wide no-underline transition-colors hover:border-[--red] hover:text-[--red] active:scale-95"
          style={{ borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
        >
          + Nuovo
        </Link>
      </div>

      <UtentiList utenti={utentiWithCount} />
    </PageLayout>
  )
}
