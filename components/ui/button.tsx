'use client'

export function Button({
  children,
  className = '',
  style,
  onClick,
  disabled,
  title,
  type = 'button',
}: {
  children: React.ReactNode
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
      className={`${className} active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
      style={style}
    >
      {children}
    </button>
  )
}
