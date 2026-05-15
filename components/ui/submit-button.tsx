'use client'

import { useFormStatus } from 'react-dom'

export function SubmitButton({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} active:scale-95 disabled:opacity-60 disabled:cursor-wait`}
      style={style}
    >
      {pending ? (
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block rounded-full border border-current border-t-transparent animate-spin flex-shrink-0"
            style={{ width: '0.75em', height: '0.75em' }}
          />
          {children}
        </span>
      ) : children}
    </button>
  )
}
