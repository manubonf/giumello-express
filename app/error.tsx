'use client'

import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--red)' }}>
        Qualcosa è andato storto
      </h2>
      <p className="font-mono text-sm mb-6" style={{ color: 'var(--text-dim)' }}>{error.message}</p>
      <Button
        onClick={reset}
        className="rounded-sm border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors hover:border-[--red] hover:text-[--red]"
        style={{ background: 'none', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
      >
        Riprova
      </Button>
    </div>
  )
}