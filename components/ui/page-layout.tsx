export function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: `
          linear-gradient(var(--red-muted) 1px, transparent 1px),
          linear-gradient(90deg, var(--red-muted) 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px',
      }}
    >
      <div className="max-w-xl mx-auto px-4 py-6 pb-12">
        {children}
      </div>
    </div>
  )
}
