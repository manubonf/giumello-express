import { requireMaster } from '@/lib/auth'

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  await requireMaster()
  return <>{children}</>
}
