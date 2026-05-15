export function FormField({
  label,
  optional,
  description,
  className,
  children,
}: {
  label: string
  optional?: boolean
  description?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`flex flex-col gap-1.5${className ? ` ${className}` : ''}`}>
      <label className="font-mono text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
        {optional && (
          <span className="ml-2 normal-case" style={{ color: 'var(--text-dim)' }}>(opzionale)</span>
        )}
      </label>
      {children}
      {description && (
        <p className="font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>
          {description}
        </p>
      )}
    </div>
  )
}
