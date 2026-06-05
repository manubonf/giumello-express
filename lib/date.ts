const TZ = 'Europe/Rome'

export function dayLabel(iso: string): 'oggi' | 'domani' | 'dopodomani' | null {
  const now = new Date()
  const date = new Date(iso)
  const fmt = new Intl.DateTimeFormat('it-IT', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
  const startOfDay = (d: Date) => {
    const parts = fmt.formatToParts(d)
    const get = (type: string) => Number(parts.find(p => p.type === type)?.value)
    return new Date(get('year'), get('month') - 1, get('day')).getTime()
  }
  const diff = Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000)
  if (diff === 0) return 'oggi'
  if (diff === 1) return 'domani'
  if (diff === 2) return 'dopodomani'
  return null
}

export function formatShort(iso: string) {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
    timeZone: TZ,
  }).format(new Date(iso))
}

export function formatFull(iso: string) {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: TZ,
  }).format(new Date(iso))
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeZone: TZ }).format(new Date(iso))
}

export function formatMediumTime(iso: string) {
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ }).format(new Date(iso))
}

export function formatLongTime(iso: string) {
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'long', timeStyle: 'short', timeZone: TZ }).format(new Date(iso))
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(new Date(iso))
}
