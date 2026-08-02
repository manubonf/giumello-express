import { notFound } from 'next/navigation'
import { PageLayout } from '@/components/ui/page-layout'
import { PageHeader, MasterBadge } from '@/components/ui/page-header'
import { SubmitButton } from '@/components/ui/submit-button'
import { DetailRow } from '@/components/ui/detail-row'
import { ErrorAlert } from '@/components/ui/alert'
import { CredentialBox } from '@/components/ui/credential-box'
import { supabaseAdmin } from '@/lib/supabase'
import { updateUsername, resetPassword, deleteUser, addAmmonizione, removeAmmonizione } from '@/app/master/utenti/actions'
import { SuccessAlert } from '@/components/ui/alert'
import { FormField } from '@/components/ui/form-field'
import { formatLongTime } from '@/lib/date'
import { errorMessage } from '@/lib/errors'

export default async function UtenteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ok?: string; u?: string; pw?: string; error?: string; detail?: string }>

}) {
  const [{ id }, { ok, u, pw, error, detail }] = await Promise.all([params, searchParams])

  const [{ data: profile }, { data: ammonizioni }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, username, role, created_at')
      .eq('id', id)
      .single(),
    supabaseAdmin
      .from('ammonizioni')
      .select('id, nota, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!profile) notFound()

  const isMaster = profile.role === 'master'

  return (
    <PageLayout>
      <PageHeader backHref="/master/utenti" right={<MasterBadge />} />

      <div className="flex items-center gap-3 mb-8">
        <h1 className="leading-none" style={{ fontFamily: "var(--font-display)", fontSize: "3rem", fontWeight: 400, color: "var(--text)" }}>{profile.username}</h1>
        <span
          className="font-mono text-xs uppercase tracking-widest rounded-xl border px-1.5 py-0.5"
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

      {error && <ErrorAlert message={`${errorMessage(error)}${detail ? ` — ${detail}` : ''}`} />}

      <div className="rounded-xl border mb-8" style={{ borderColor: 'var(--border)' }}>
        <div className="px-4">
          <DetailRow label="Username" value={profile.username} />
          <DetailRow label="Ruolo" value={isMaster ? 'Master' : 'Utente base'} />
          <DetailRow label="Creato il" value={formatLongTime(profile.created_at)} />
        </div>
      </div>

      {!isMaster && (
        <>
          <p className="font-mono text-xs uppercase tracking-widest mb-3"
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
                className="w-full rounded-xl border px-4 py-2.5.5 font-mono text-sm"
                style={{
                  background: 'var(--bg-panel)',
                  borderColor: 'var(--border-muted)',
                  color: 'var(--text)',
                }}
              />
            </FormField>
            <div>
              <SubmitButton
                className="rounded-xl border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors"
                style={{ background: '#22c55e', borderColor: '#22c55e', color: 'white' }}
              >
                Salva username
              </SubmitButton>
            </div>
          </form>

          <div className="flex flex-wrap gap-3 mb-10">
            <form action={resetPassword}>
              <input type="hidden" name="id" value={profile.id} />
              <input type="hidden" name="username" value={profile.username} />
              <SubmitButton
                className="rounded-xl border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors"
                style={{ background: 'none', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
              >
                Reimposta password
              </SubmitButton>
            </form>

            <form action={deleteUser}>
              <input type="hidden" name="id" value={profile.id} />
              <SubmitButton
                className="rounded-xl border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors"
                style={{ background: 'var(--red)', borderColor: 'var(--red)', color: 'white' }}
              >
                Rimuovi utente
              </SubmitButton>
            </form>
          </div>

          <p className="font-mono text-xs uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-muted)' }}>
            Ammonizioni
          </p>

          <div className="rounded-xl border mb-4" style={{ borderColor: 'var(--border)' }}>
            {(ammonizioni ?? []).length === 0 ? (
              <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                Nessuna ammonizione registrata.
              </p>
            ) : (
              <ul>
                {(ammonizioni ?? []).map((a, i) => (
                  <li
                    key={a.id}
                    className="flex items-start justify-between gap-3 px-4 py-3"
                    style={{
                      borderTop: i > 0 ? '1px solid var(--border)' : undefined,
                    }}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm break-words" style={{ color: 'var(--text)' }}>{a.nota}</span>
                      <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                        {formatLongTime(a.created_at)}
                      </span>
                    </div>
                    <form action={removeAmmonizione} className="shrink-0">
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="user_id" value={profile.id} />
                      <SubmitButton
                        className="rounded-xl border px-2.5 py-1 font-mono text-xs uppercase tracking-wide transition-colors"
                        style={{ background: 'none', borderColor: 'var(--red-border)', color: 'var(--red)' }}
                      >
                        Rimuovi
                      </SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form action={addAmmonizione} className="flex flex-col gap-3">
            <input type="hidden" name="user_id" value={profile.id} />
            <FormField label="Nuova ammonizione">
              <textarea
                name="nota"
                required
                rows={2}
                placeholder="Descrivi il comportamento scorretto…"
                className="w-full rounded-xl border px-4 py-3 text-sm resize-none"
                style={{
                  background: 'var(--bg-panel)',
                  borderColor: 'var(--border-muted)',
                  color: 'var(--text)',
                }}
              />
            </FormField>
            <div>
              <SubmitButton
                className="rounded-xl border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors"
                style={{ background: 'var(--red)', borderColor: 'var(--red)', color: 'white' }}
              >
                Aggiungi ammonizione
              </SubmitButton>
            </div>
          </form>
        </>
      )}
    </PageLayout>
  )
}
