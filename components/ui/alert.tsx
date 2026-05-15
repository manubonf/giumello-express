export function ErrorAlert({ message }: { message: string }) {
  return (
    <p className="rounded-sm border px-4 py-3 font-mono text-sm mb-6"
      style={{ borderColor: 'var(--red-border)', color: 'var(--red)', background: 'var(--red-muted)' }}>
      {message}
    </p>
  )
}

export function SuccessAlert({ message }: { message: string }) {
  return (
    <p className="rounded-sm border px-4 py-3 font-mono text-sm mb-6"
      style={{ borderColor: '#22c55e40', color: '#22c55e', background: '#22c55e10' }}>
      {message}
    </p>
  )
}
