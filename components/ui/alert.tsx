export function ErrorAlert({ message }: { message: string }) {
  return (
    <p className="rounded-xl border px-4 py-3 font-mono text-sm mb-6"
      style={{ borderColor: 'var(--red-border)', color: 'var(--red)', background: 'var(--red-muted)' }}>
      {message}
    </p>
  )
}

export function SuccessAlert({ message }: { message: string }) {
  return (
    <p className="rounded-xl border px-4 py-3 font-mono text-sm mb-6"
      style={{ borderColor: '#16a34a30', color: '#15803d', background: 'rgba(22,163,74,0.06)' }}>
      {message}
    </p>
  )
}
