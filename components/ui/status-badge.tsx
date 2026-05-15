export const STATUS_LABEL: Record<string, string> = {
  draft:     'Bozza',
  confirmed: 'Confermata',
  full:      'Completa',
  done:      'Effettuata',
  cancelled: 'Cancellata',
  pending:   'In attesa',
  accepted:  'Accettata',
  rejected:  'Rifiutata',
}

export const STATUS_COLOR: Record<string, string> = {
  draft:     '#888',
  confirmed: '#22c55e',
  full:      '#f59e0b',
  done:      '#555',
  cancelled: '#e01110',
  pending:   '#f59e0b',
  accepted:  '#22c55e',
  rejected:  '#e01110',
}

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? '#888'
  return (
    <span
      className="font-mono text-xs rounded-sm px-1.5 py-0.5"
      style={{
        color,
        background: `${color}18`,
        border: `1px solid ${color}40`,
      }}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

export function StatusDot({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
  return (
    <span
      className={`${size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2'} rounded-full flex-shrink-0`}
      style={{ background: STATUS_COLOR[status] ?? '#888' }}
    />
  )
}
