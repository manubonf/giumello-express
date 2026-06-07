import { PageLayout } from '@/components/ui/page-layout'

function Skel({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-sm animate-pulse ${className}`}
      style={{ background: 'var(--border)' }}
    />
  )
}

export default function Loading() {
  return (
    <PageLayout>
      <header
        className="flex items-center justify-between pb-6 mb-10"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <Skel className="w-8 h-8" />
          <Skel className="w-20 h-5" />
        </div>
        <Skel className="w-14 h-5" />
      </header>

      <Skel className="w-36 h-7 mb-8" />

      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="rounded-sm border px-4 py-3"
            style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
          >
            <Skel className="w-3/4 h-4 mb-2" />
            <Skel className="w-1/2 h-3" />
          </div>
        ))}
      </div>
    </PageLayout>
  )
}
