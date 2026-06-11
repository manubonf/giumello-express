import { after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendPush } from '@/lib/push'
import { baseIdsWithPref, shuttleBody } from '@/lib/notif'

export type ShuttleForm = {
  departureTime: string
  maxSeats: number
  minSeats: number
}

/** Estrae e valida i campi navetta dal form. Restituisce null se non validi. */
export function parseShuttleForm(formData: FormData): ShuttleForm | null {
  const departureTime = (formData.get('departure_time') as string ?? '').trim()
  const maxSeats = parseInt(formData.get('max_seats') as string)
  const minSeatsRaw = (formData.get('min_seats') as string ?? '').trim()

  if (!departureTime || isNaN(maxSeats) || maxSeats < 1) return null

  const minSeats = minSeatsRaw === '' ? 0 : parseInt(minSeatsRaw)
  if (isNaN(minSeats) || minSeats < 0) return null

  return { departureTime, maxSeats, minSeats }
}

/**
 * Crea una navetta (confermata se min_seats = 0, altrimenti bozza) e pianifica
 * via after() la notifica U2/U3 agli utenti base con la preferenza attiva.
 */
export async function createShuttleAndNotify(
  form: ShuttleForm,
  createdBy: string,
  proposalId?: string,
): Promise<{ id: string } | { error: true }> {
  const isConfirmed = form.minSeats === 0

  const { data: shuttle, error } = await supabaseAdmin.from('shuttles').insert({
    departure_time: form.departureTime,
    max_seats: form.maxSeats,
    available_seats: form.maxSeats,
    min_seats: form.minSeats,
    created_by: createdBy,
    status: isConfirmed ? 'confirmed' : 'draft',
    ...(proposalId ? { proposal_id: proposalId } : {}),
  }).select('id').single()

  if (error || !shuttle) {
    console.error('[createShuttleAndNotify] insert error:', error)
    return { error: true }
  }

  // U2 (nuova navetta in bozza) o U3 (nuova navetta confermata direttamente)
  const pref = isConfirmed ? 'notif_u3' : 'notif_u2'
  const title = isConfirmed ? 'Nuova navetta confermata' : 'Nuova navetta disponibile (non ancora confermata)'
  const body = shuttleBody(form.departureTime, form.maxSeats)
  const shuttleId = shuttle.id

  after(async () => {
    const ids = await baseIdsWithPref(pref)
    if (ids.length) {
      await sendPush(ids, { title, body, url: `/base/navette/${shuttleId}` })
    }
  })

  return { id: shuttle.id }
}
