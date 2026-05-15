export function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      className="flex items-baseline justify-between py-3"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <span className="font-mono text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span className="text-sm font-medium" style={{ color: '#e8e8e8' }}>{value}</span>
    </div>
  )
}
