import { supabaseAdmin } from '@/lib/supabase'

export type ShuttleSnapshot = {
  status: string
  departure_time: string
  max_seats: number
  available_seats: number
}

export async function getShuttleSnapshot(shuttleId: string): Promise<ShuttleSnapshot | null> {
  const { data } = await supabaseAdmin
    .from('shuttles')
    .select('status, departure_time, max_seats, available_seats')
    .eq('id', shuttleId)
    .single()
  return data
}

/**
 * Restituisce gli user_id dei profili registrati che sono PARTECIPANTI su questa navetta.
 * Non include i booker che non compaiono anche come partecipanti.
 */
export async function getParticipantUserIds(shuttleId: string): Promise<Set<string>> {
  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('shuttle_id', shuttleId)

  const bookingIds = (bookings ?? []).map(b => b.id)
  if (!bookingIds.length) return new Set()

  const { data: participants } = await supabaseAdmin
    .from('booking_participants')
    .select('user_id')
    .in('booking_id', bookingIds)
    .eq('is_guest', false)

  return new Set((participants ?? []).filter(p => p.user_id).map(p => p.user_id as string))
}

/**
 * Restituisce gli user_id dei profili registrati che sono booker O partecipanti su questa navetta.
 * Usato per prevenire di prenotare qualcuno già "presente" nella navetta in qualunque ruolo.
 */
export async function getBookedUserIds(shuttleId: string): Promise<Set<string>> {
  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('id, booker_id')
    .eq('shuttle_id', shuttleId)

  const ids = new Set<string>()
  const bookingIds = (bookings ?? []).map(b => b.id)

  for (const b of bookings ?? []) ids.add(b.booker_id)

  if (bookingIds.length) {
    const { data: participants } = await supabaseAdmin
      .from('booking_participants')
      .select('user_id')
      .in('booking_id', bookingIds)
      .eq('is_guest', false)
    for (const p of participants ?? []) if (p.user_id) ids.add(p.user_id)
  }

  return ids
}

/**
 * Crea un booking + un singolo partecipante dopo aver prenotato un posto via book_seats.
 * In caso di errore a metà sequenza esegue il rollback (delete + release_seats).
 */
export async function createSingleBooking(
  shuttleId: string,
  bookerId: string,
  participant: { user_id: string | null; is_guest: boolean; guest_label: string | null },
): Promise<{ bookingId: string } | { error: string }> {
  const { error: bookError } = await supabaseAdmin.rpc('book_seats', {
    p_shuttle_id: shuttleId,
    p_count: 1,
  })

  if (bookError) {
    if (bookError.message.includes('non prenotabile')) return { error: 'navetta-non-prenotabile' }
    if (bookError.message.includes('Posti insufficienti')) return { error: 'posti-insufficienti' }
    return { error: 'errore-prenotazione' }
  }

  const { data: booking, error: insertError } = await supabaseAdmin
    .from('bookings')
    .insert({ shuttle_id: shuttleId, booker_id: bookerId })
    .select('id')
    .single()

  if (insertError || !booking) {
    await supabaseAdmin.rpc('release_seats', { p_shuttle_id: shuttleId, p_count: 1 })
    return { error: 'errore-prenotazione' }
  }

  const { error: partError } = await supabaseAdmin
    .from('booking_participants')
    .insert({ booking_id: booking.id, ...participant })

  if (partError) {
    await supabaseAdmin.from('bookings').delete().eq('id', booking.id)
    await supabaseAdmin.rpc('release_seats', { p_shuttle_id: shuttleId, p_count: 1 })
    return { error: 'errore-prenotazione' }
  }

  return { bookingId: booking.id }
}
