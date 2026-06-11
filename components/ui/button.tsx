'use client'

// Varianti condivise: colori e comportamento hover. Il padding resta al chiamante
// via className (le dimensioni variano da contesto a contesto).
export type ButtonVariant = 'primary' | 'danger' | 'outline' | 'cancel'

export const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'rounded-xl border font-mono text-xs uppercase tracking-wide transition-colors',
  danger:  'rounded-xl border font-mono text-xs uppercase tracking-wide transition-colors',
  outline: 'rounded-xl border font-mono text-xs uppercase tracking-wide transition-colors hover:opacity-80',
  cancel:  'rounded-xl border font-mono text-xs uppercase tracking-wide transition-colors hover:border-[--red] hover:text-[--red]',
}

export const VARIANT_STYLE: Record<ButtonVariant, React.CSSProperties> = {
  primary: { background: '#22c55e', borderColor: '#22c55e', color: 'white' },
  danger:  { background: 'var(--red)', borderColor: 'var(--red)', color: 'white' },
  outline: { background: 'none', borderColor: 'var(--border)', color: 'var(--text)' },
  cancel:  { background: 'none', borderColor: 'var(--border-muted)', color: 'var(--text-dim)' },
}

export function Button({
  children,
  variant,
  className = '',
  style,
  onClick,
  disabled,
  title,
  type = 'button',
}: {
  children: React.ReactNode
  variant?: ButtonVariant
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
  disabled?: boolean
  title?: string
  type?: 'button' | 'submit' | 'reset'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${variant ? `${VARIANT_CLASS[variant]} ` : ''}${className} active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
      style={variant ? { ...VARIANT_STYLE[variant], ...style } : style}
    >
      {children}
    </button>
  )
}
