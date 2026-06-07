// proxy.ts garantisce già che solo i master raggiungano /master/*.
// requireMaster() qui era ridondante e costava 2 query DB per ogni navigazione.
export default function MasterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
