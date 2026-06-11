import Link from 'next/link'
import { NavetteLogo } from './navettelogo'

export function PageHeader({
  backHref,
  logoHeight = 24,
  right,
}: {
  backHref?: string
  logoHeight?: number
  right?: React.ReactNode
}) {
  return (
    <header
      className="flex items-center justify-between pb-6 mb-10"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="flex items-center rounded-lg border px-3 py-1.5 font-mono text-sm no-underline transition-all hover:border-[--red] hover:text-[--red] active:scale-95"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-panel)' }}
          >
            ←
          </Link>
        )}
        <Link href="/" className="no-underline flex items-center">
          <NavetteLogo height={logoHeight} />
        </Link>
      </div>
      {right}
    </header>
  )
}

export function MasterBadge() {
  return (
    <span
      className="font-mono text-[10px] uppercase tracking-widest rounded-lg border px-2 py-1"
      style={{ color: 'var(--red)', borderColor: 'var(--red-border)', background: 'var(--red-muted)' }}
    >
      Master
    </span>
  )
}
