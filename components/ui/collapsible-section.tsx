'use client'

import { useState } from 'react'

export function CollapsibleSection({
  label,
  count,
  children,
  defaultOpen = false,
}: {
  label: string
  count?: number
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 mb-3 group"
      >
        <span
          className="font-mono text-xs uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}{count !== undefined ? ` (${count})` : ''}
        </span>
        <span
          className="font-mono text-xs transition-transform duration-150 inline-block"
          style={{
            color: 'var(--text-muted)',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        >
          ▾
        </span>
      </button>
      {open && children}
    </section>
  )
}
