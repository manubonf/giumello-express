'use client'

import { useState } from 'react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <button
      onClick={handleCopy}
      className="rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors"
      style={{
        background: 'none',
        borderColor: copied ? 'var(--red)' : 'var(--border-muted)',
        color: copied ? 'var(--red)' : 'var(--text-dim)',
      }}
    >
      {copied ? 'Copiato!' : 'Copia'}
    </button>
  )
}
