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
  draft:     '#7a9eb0',
  confirmed: '#16a34a',
  full:      '#d97706',
  done:      '#3a6070',
  cancelled: '#dc2626',
  pending:   '#d97706',
  accepted:  '#16a34a',
  rejected:  '#dc2626',
}

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? '#7a9eb0'
  return (
    <span
      className="font-mono text-xs rounded-lg px-1.5 py-0.5"
      style={{
        color,
        background: `${color}14`,
        border: `1px solid ${color}38`,
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
      style={{ background: STATUS_COLOR[status] ?? '#7a9eb0' }}
    />
  )
}
