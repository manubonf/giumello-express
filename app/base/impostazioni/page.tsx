import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader } from '@/components/ui/page-header'
import { getCurrentUser } from '@/lib/auth'

export default async function ImpostazioniPage() {
  const { profile } = await getCurrentUser()

  return (
    <PageLayout>
      <PageHeader backHref="/" />

      <h1 className="text-xl font-semibold mb-8">Impostazioni</h1>

      <p className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
        Nessuna impostazione disponibile al momento.
      </p>
    </PageLayout>
  )
}
