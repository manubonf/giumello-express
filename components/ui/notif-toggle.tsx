'use client'

import { useState, useTransition } from 'react'

export function NotifToggle({
  label,
  description,
  enabled,
  action,
}: {
  label: string
  description?: string
  enabled: boolean
  action: (enabled: boolean) => Promise<void>
}) {
  const [optimistic, setOptimistic] = useState(enabled)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    const next = !optimistic
    setOptimistic(next)
    startTransition(() => action(next))
  }

  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="font-mono text-sm" style={{ color: 'var(--text)' }}>{label}</p>
        {description && (
          <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={optimistic}
        onClick={handleToggle}
        disabled={isPending}
        className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 disabled:opacity-50"
        style={{ background: optimistic ? 'var(--red)' : 'var(--border)' }}
      >
        <span
          className="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: optimistic ? 'translateX(16px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}
