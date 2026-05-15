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
          <Link href={backHref} className="font-mono text-sm no-underline"
            style={{ color: 'var(--text-muted)' }}>←</Link>
        )}
        <NavetteLogo height={logoHeight} />
      </div>
      {right}
    </header>
  )
}

export function MasterBadge() {
  return (
    <span
      className="font-mono text-[10px] uppercase tracking-widest rounded-sm border px-1.5 py-0.5"
      style={{ color: 'var(--red)', borderColor: 'var(--red-border)' }}
    >
      Master
    </span>
  )
}
