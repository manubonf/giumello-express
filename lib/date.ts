export function formatShort(iso: string) {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

export function formatFull(iso: string) {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium' }).format(new Date(iso))
}

export function formatMediumTime(iso: string) {
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

export function formatLongTime(iso: string) {
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso))
}
