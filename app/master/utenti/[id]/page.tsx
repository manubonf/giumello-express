import { notFound } from 'next/navigation'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader, MasterBadge } from '@/components/ui/page-header'
import { SubmitButton } from '@/components/ui/submit-button'
import { DetailRow } from '@/components/ui/detail-row'
import { ErrorAlert } from '@/components/ui/alert'
import { CredentialBox } from '@/components/ui/credential-box'
import { supabaseAdmin } from '@/lib/supabase'
import { updateUsername, resetPassword, deleteUser } from '@/app/master/utenti/actions'
import { SuccessAlert } from '@/components/ui/alert'
import { FormField } from '@/components/ui/form-field'
import { formatLongTime } from '@/lib/date'

const ERROR_MSG: Record<string, string> = {
  'errore-reset':       'Errore durante il reset della password. Riprova.',
  'errore-salvataggio': 'Errore durante il salvataggio. Riprova.',
  'username-non-valido': 'Username non valido. Usa solo lettere minuscole, numeri e underscore (2–30 caratteri).',
  'username-esistente':  'Username già in uso.',
}

export default async function UtenteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ok?: string; u?: string; pw?: string; error?: string; }>

}) {
  const [{ id }, { ok, u, pw, error }] = await Promise.all([params, searchParams])

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, username, role, created_at')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  const isMaster = profile.role === 'master'

  return (
    <PageLayout>
      <PageHeader backHref="/master/utenti" right={<MasterBadge />} />

      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-xl font-semibold">{profile.username}</h1>
        <span
          className="font-mono text-[10px] uppercase tracking-widest rounded-sm border px-1.5 py-0.5"
          style={{
            color: isMaster ? 'var(--red)' : 'var(--text-muted)',
            borderColor: isMaster ? 'var(--red-border)' : 'var(--border-muted)',
          }}
        >
          {isMaster ? 'Master' : 'Utente'}
        </span>
      </div>

      {ok === '1' && u && pw && (
        <CredentialBox username={u} password={pw} />
      )}
      {ok === 'username' && <SuccessAlert message="Username aggiornato." />}

      {error && <ErrorAlert message={ERROR_MSG[error] ?? 'Errore sconosciuto.'} />}

      <div className="rounded-sm border mb-8" style={{ borderColor: 'var(--border)' }}>
        <div className="px-4">
          <DetailRow label="Username" value={profile.username} />
          <DetailRow label="Ruolo" value={isMaster ? 'Master' : 'Utente base'} />
          <DetailRow label="Creato il" value={formatLongTime(profile.created_at)} />
        </div>
      </div>

      {!isMaster && (
        <>
          <p className="font-mono text-[10px] uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-muted)' }}>
            Modifica username
          </p>
          <form action={updateUsername} className="flex flex-col gap-4 mb-8">
            <input type="hidden" name="id" value={profile.id} />
            <FormField label="Nuovo username" description="Solo lettere minuscole, numeri e underscore (2–30 caratteri).">
              <input
                type="text"
                name="username"
                required
                autoComplete="off"
                defaultValue={profile.username}
                placeholder="es. mario_rossi"
                className="w-full rounded-sm border px-3 py-2.5 font-mono text-sm"
                style={{
                  background: 'var(--bg-panel)',
                  borderColor: 'var(--border-muted)',
                  color: 'var(--text)',
                }}
              />
            </FormField>
            <div>
              <SubmitButton
                className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors"
                style={{ background: '#22c55e', borderColor: '#22c55e', color: 'white' }}
              >
                Salva username
              </SubmitButton>
            </div>
          </form>

          <div className="flex flex-wrap gap-3">
            <form action={resetPassword}>
              <input type="hidden" name="id" value={profile.id} />
              <input type="hidden" name="username" value={profile.username} />
              <SubmitButton
                className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors"
                style={{ background: 'none', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
              >
                Reimposta password
              </SubmitButton>
            </form>

            <form action={deleteUser}>
              <input type="hidden" name="id" value={profile.id} />
              <SubmitButton
                className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors"
                style={{ background: 'var(--red)', borderColor: 'var(--red)', color: 'white' }}
              >
                Rimuovi utente
              </SubmitButton>
            </form>
          </div>
        </>
      )}
    </PageLayout>
  )
}
