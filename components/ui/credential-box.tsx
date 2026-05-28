import { CopyButton } from './copy-button'

export function CredentialBox({ username, password }: { username: string; password: string }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  const text = siteUrl
    ? `Sito: ${siteUrl}\nUsername: ${username}\nPassword: ${password}`
    : `Username: ${username}\nPassword: ${password}`
  return (
    <div className="rounded-sm border px-4 py-4 mb-8"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="font-mono text-[10px] uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}>
          Credenziali — salva ora
        </p>
        <CopyButton text={text} />
      </div>
      <div className="flex flex-col gap-3">
        {siteUrl && (
          <>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>Sito</span>
              <a href={siteUrl} target="_blank" rel="noopener noreferrer"
                className="font-mono text-sm font-semibold hover:underline"
                style={{ color: 'var(--text)' }}>{siteUrl}</a>
            </div>
            <div style={{ borderTop: '1px solid var(--border-subtle)' }} />
          </>
        )}
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>Username</span>
          <span className="font-mono text-sm font-semibold selectable" style={{ color: 'var(--text)' }}>{username}</span>
        </div>
        <div style={{ borderTop: '1px solid var(--border-subtle)' }} />
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>Password</span>
          <span className="font-mono text-sm font-semibold tracking-wide selectable" style={{ color: 'var(--text)' }}>{password}</span>
        </div>
      </div>
      <p className="font-mono text-[11px] mt-4" style={{ color: 'var(--text-dim)' }}>
        La password non verrà mostrata di nuovo. Comunicala all&apos;utente e poi chiudi questa pagina.
      </p>
    </div>
  )
}
