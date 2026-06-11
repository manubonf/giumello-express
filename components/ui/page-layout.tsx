export function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-xl mx-auto px-4 py-6 pb-12">
        {children}
      </div>
    </div>
  )
}
