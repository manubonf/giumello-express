import Link from 'next/link'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader, MasterBadge } from '@/components/ui/page-header'
import { supabaseAdmin } from '@/lib/supabase'
import { UtentiList } from './_components/utenti-list'

export default async function MasterUtentiPage() {
  const { data: utenti } = await supabaseAdmin
    .from('profiles')
    .select('id, username, created_at')
    .eq('role', 'base')
    .order('username', { ascending: true })

  return (
    <PageLayout>
      <PageHeader backHref="/" right={<MasterBadge />} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Utenti</h1>
        <Link
          href="/master/utenti/nuovo"
          className="rounded-sm border px-3 py-1.5 font-mono text-xs uppercase tracking-wide no-underline transition-colors hover:border-[--red] hover:text-[--red] active:scale-95"
          style={{ borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
        >
          + Nuovo
        </Link>
      </div>

      <UtentiList utenti={utenti ?? []} />
    </PageLayout>
  )
}
