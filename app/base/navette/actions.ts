'use server'

import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendPush } from '@/lib/push'
import {
  masterIdsWithPref,
  sendStateChangePush,
  sendSeatUpdatePush,
  shuttleBody,
} from '@/lib/notif'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'

type ShuttleSnapshot = {
  status: string
  departure_time: string
  max_seats: number
  available_seats: number
}

async function getShuttleSnapshot(shuttleId: string): Promise<ShuttleSnapshot | null> {
  const { data } = await supabaseAdmin
    .from('shuttles')
    .select('status, departure_time, max_seats, available_seats')
    .eq('id', shuttleId)
    .single()
  return data
}

async function sendBookingNotifications(
  shuttleId: string,
  before: ShuttleSnapshot,
  after: ShuttleSnapshot,
  actorId: string,
  masterTitle: string,
  masterPref: 'notif_m2' | 'notif_m3' | 'notif_m4',
) {
  const body = shuttleBody(before.departure_time, after.available_seats, before.max_seats)
  const masterUrl = `/master/navette/${shuttleId}`
  const stateChanged = before.status !== after.status

  const tasks: Promise<unknown>[] = []

  tasks.push(
    masterIdsWithPref(masterPref).then(ids =>
      ids.length ? sendPush(ids, { title: masterTitle, body, url: masterUrl }) : undefined
    )
  )

  if (stateChanged && after.status === 'confirmed' && before.status === 'draft') {
    tasks.push(
      masterIdsWithPref('notif_m5').then(ids =>
        ids.length ? sendPush(ids, { title: 'Navetta confermata automaticamente', body, url: masterUrl }) : undefined
      )
    )
  }

  if (stateChanged && after.status === 'draft') {
    tasks.push(
      masterIdsWithPref('notif_m6').then(ids =>
        ids.length ? sendPush(ids, { title: 'Navetta tornata in bozza — passeggeri insufficienti', body, url: masterUrl }) : undefined
      )
    )
  }

  if (stateChanged) {
    let stateTitle: string
    if (after.status === 'confirmed') stateTitle = 'Navetta confermata'
    else if (after.status === 'full') stateTitle = 'Navetta al completo'
    else if (after.status === 'draft') stateTitle = 'Navetta tornata in bozza'
    else stateTitle = 'Aggiornamento navetta'
    tasks.push(sendStateChangePush(shuttleId, stateTitle, body, actorId))
  } else {
    tasks.push(sendSeatUpdatePush(shuttleId, masterTitle, body, actorId))
  }

  await Promise.all(tasks)
}

/**
 * Restituisce gli user_id dei profili registrati che sono PARTECIPANTI su questa navetta.
 * Non include i booker che non compaiono anche come partecipanti.
 */
async function getParticipantUserIds(shuttleId: string): Promise<Set<string>> {
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
 * Usato per `bookOtherUser`: previene di prenotare qualcuno già "presente" nella navetta in qualunque ruolo.
 */
async function getBookedUserIds(shuttleId: string): Promise<Set<string>> {
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
 * Helper condiviso: crea un booking + un singolo partecipante dopo aver prenotato un posto.
 */
async function createSingleBooking(
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

// ─── Azioni pubbliche ────────────────────────────────────────────────────────

/**
 * Prenota per sé — crea un booking con booker_id = current_user e participant = current_user.
 * Bloccato se l'utente è già partecipante su questa navetta (anche se prenotato da qualcun altro).
 */
export async function bookSelf(formData: FormData) {
  const { user } = await getCurrentUser()
  const shuttleId = formData.get('shuttle_id') as string

  const [shuttleBefore, participantIds] = await Promise.all([
    getShuttleSnapshot(shuttleId),
    getParticipantUserIds(shuttleId),
  ])

  if (participantIds.has(user.id)) {
    redirect(`/base/navette/${shuttleId}?error=prenotazione-esistente`)
  }

  const result = await createSingleBooking(shuttleId, user.id, {
    user_id: user.id,
    is_guest: false,
    guest_label: null,
  })

  if ('error' in result) redirect(`/base/navette/${shuttleId}?error=${result.error}`)

  const shuttleAfter = await getShuttleSnapshot(shuttleId)
  if (shuttleBefore && shuttleAfter) {
    after(() => sendBookingNotifications(shuttleId, shuttleBefore, shuttleAfter, user.id, 'Nuova prenotazione', 'notif_m2'))
  }

  revalidatePath(`/base/navette/${shuttleId}`)
  redirect(`/base/navette/${shuttleId}?ok=1`)
}

/**
 * Prenota un altro utente registrato.
 * Bloccato se il target è già booker o partecipante su questa navetta, o se è master.
 */
export async function bookOtherUser(formData: FormData) {
  const { user } = await getCurrentUser()
  const shuttleId = formData.get('shuttle_id') as string
  const targetUserId = formData.get('user_id') as string

  if (!targetUserId || targetUserId === user.id) {
    redirect(`/base/navette/${shuttleId}?error=partecipante-non-valido`)
  }

  // Il target non può essere master
  const { data: masterCheck } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', targetUserId)
    .eq('role', 'master')
  if (masterCheck && masterCheck.length > 0) {
    redirect(`/base/navette/${shuttleId}?error=partecipante-non-valido`)
  }

  const [shuttleBefore, bookedIds] = await Promise.all([
    getShuttleSnapshot(shuttleId),
    getBookedUserIds(shuttleId),
  ])

  if (bookedIds.has(targetUserId)) {
    redirect(`/base/navette/${shuttleId}?error=partecipante-già-prenotato`)
  }

  const result = await createSingleBooking(shuttleId, user.id, {
    user_id: targetUserId,
    is_guest: false,
    guest_label: null,
  })

  if ('error' in result) redirect(`/base/navette/${shuttleId}?error=${result.error}`)

  const shuttleAfter = await getShuttleSnapshot(shuttleId)
  if (shuttleBefore && shuttleAfter) {
    after(() => sendBookingNotifications(shuttleId, shuttleBefore, shuttleAfter, user.id, 'Nuova prenotazione', 'notif_m2'))
  }

  revalidatePath(`/base/navette/${shuttleId}`)
  redirect(`/base/navette/${shuttleId}?ok=1`)
}

/**
 * Prenota un ospite esterno.
 * Nessun controllo di unicità (gli ospiti non hanno profilo).
 */
export async function bookGuest(formData: FormData) {
  const { user } = await getCurrentUser()
  const shuttleId = formData.get('shuttle_id') as string
  const guestName = (formData.get('guest_name') as string ?? '').trim()

  if (!guestName) redirect(`/base/navette/${shuttleId}?error=nome-ospite-mancante`)

  const shuttleBefore = await getShuttleSnapshot(shuttleId)

  const result = await createSingleBooking(shuttleId, user.id, {
    user_id: null,
    is_guest: true,
    guest_label: guestName,
  })

  if ('error' in result) redirect(`/base/navette/${shuttleId}?error=${result.error}`)

  const shuttleAfter = await getShuttleSnapshot(shuttleId)
  if (shuttleBefore && shuttleAfter) {
    after(() => sendBookingNotifications(shuttleId, shuttleBefore, shuttleAfter, user.id, 'Nuova prenotazione', 'notif_m2'))
  }

  revalidatePath(`/base/navette/${shuttleId}`)
  redirect(`/base/navette/${shuttleId}?ok=1`)
}

/**
 * Rimuovi te stesso da una prenotazione creata da qualcun altro.
 * Se la prenotazione rimane senza partecipanti, viene eliminata.
 */
export async function leaveBookingAsParticipant(formData: FormData) {
  const { user } = await getCurrentUser()
  const shuttleId = formData.get('shuttle_id') as string

  // Trova le prenotazioni di questa navetta dove il booker è qualcun altro
  const { data: othersBookings } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('shuttle_id', shuttleId)
    .neq('booker_id', user.id)

  const otherBookingIds = (othersBookings ?? []).map(b => b.id)
  if (!otherBookingIds.length) redirect(`/base/navette/${shuttleId}?error=non-autorizzato`)

  // Trova il record partecipante dell'utente corrente
  const { data: participantEntry } = await supabaseAdmin
    .from('booking_participants')
    .select('id, booking_id')
    .in('booking_id', otherBookingIds)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!participantEntry) redirect(`/base/navette/${shuttleId}?error=non-autorizzato`)

  const shuttleBefore = await getShuttleSnapshot(shuttleId)

  // Rimuovi il partecipante
  await supabaseAdmin
    .from('booking_participants')
    .delete()
    .eq('id', participantEntry.id)

  // Se il booking è rimasto senza partecipanti, eliminalo
  const { count } = await supabaseAdmin
    .from('booking_participants')
    .select('id', { count: 'exact', head: true })
    .eq('booking_id', participantEntry.booking_id)

  if (count === 0) {
    await supabaseAdmin.from('bookings').delete().eq('id', participantEntry.booking_id)
  }

  // Libera il posto
  await supabaseAdmin.rpc('release_seats', { p_shuttle_id: shuttleId, p_count: 1 })

  const shuttleAfter = await getShuttleSnapshot(shuttleId)
  if (shuttleBefore && shuttleAfter) {
    after(() => sendBookingNotifications(shuttleId, shuttleBefore, shuttleAfter, user.id, 'Prenotazione rimossa', 'notif_m4'))
  }

  revalidatePath(`/base/navette/${shuttleId}`)
  redirect(`/base/navette/${shuttleId}`)
}

/**
 * Cancella una tua prenotazione (dove sei il booker).
 */
export async function cancelBooking(formData: FormData) {
  const { user } = await getCurrentUser()

  const bookingId = formData.get('booking_id') as string
  const shuttleId = formData.get('shuttle_id') as string

  const [{ data: booking }, shuttleBefore] = await Promise.all([
    supabaseAdmin
      .from('bookings')
      .select('id, booker_id, shuttle_id')
      .eq('id', bookingId)
      .eq('booker_id', user.id)
      .single(),
    getShuttleSnapshot(shuttleId),
  ])

  if (!booking) redirect(`/base/navette/${shuttleId}?error=non-autorizzato`)

  const { count } = await supabaseAdmin
    .from('booking_participants')
    .select('id', { count: 'exact', head: true })
    .eq('booking_id', bookingId)

  const participantCount = count ?? 0

  await supabaseAdmin.from('bookings').delete().eq('id', bookingId)

  if (participantCount > 0) {
    await supabaseAdmin.rpc('release_seats', {
      p_shuttle_id: booking.shuttle_id,
      p_count: participantCount,
    })
  }

  const shuttleAfter = await getShuttleSnapshot(shuttleId)
  if (shuttleBefore && shuttleAfter) {
    after(() => sendBookingNotifications(shuttleId, shuttleBefore, shuttleAfter, user.id, 'Prenotazione cancellata', 'notif_m4'))
  }

  revalidatePath(`/base/navette/${booking.shuttle_id}`)
  redirect(`/base/navette/${booking.shuttle_id}`)
}
