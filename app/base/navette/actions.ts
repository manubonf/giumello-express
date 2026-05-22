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

  // Master notification for the booking event
  tasks.push(
    masterIdsWithPref(masterPref).then(ids =>
      ids.length ? sendPush(ids, { title: masterTitle, body, url: masterUrl }) : undefined
    )
  )

  // M5: auto-confirmed (draft → confirmed via book_seats)
  if (stateChanged && after.status === 'confirmed' && before.status === 'draft') {
    tasks.push(
      masterIdsWithPref('notif_m5').then(ids =>
        ids.length ? sendPush(ids, { title: 'Navetta confermata automaticamente', body, url: masterUrl }) : undefined
      )
    )
  }

  // M6: back to draft (confirmed → draft via release_seats)
  if (stateChanged && after.status === 'draft') {
    tasks.push(
      masterIdsWithPref('notif_m6').then(ids =>
        ids.length ? sendPush(ids, { title: 'Navetta tornata in bozza — passeggeri insufficienti', body, url: masterUrl }) : undefined
      )
    )
  }

  // Base users: state change (U4/U5) or seat update (U6/U7)
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

export async function createBooking(formData: FormData) {
  const { user } = await getCurrentUser()

  const shuttleId = formData.get('shuttle_id') as string
  const includeBooker = formData.get('include_booker') === 'on'
  const participantIds = (formData.getAll('participant_ids') as string[])
    .filter(id => id && id !== user.id)
  const guestNames = (formData.getAll('guest_names') as string[])
    .map(g => g.trim()).filter(Boolean).slice(0, 20)

  const allUserIds = includeBooker ? [user.id, ...participantIds] : participantIds
  const totalCount = allUserIds.length + guestNames.length

  if (participantIds.length > 0) {
    const { data: masterCheck } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .in('id', participantIds)
      .eq('role', 'master')
    if (masterCheck && masterCheck.length > 0) {
      redirect(`/base/navette/${shuttleId}?error=partecipante-non-valido`)
    }
  }

  const [shuttleBefore, { data: shuttleBookings }] = await Promise.all([
    getShuttleSnapshot(shuttleId),
    supabaseAdmin.from('bookings').select('id, booker_id').eq('shuttle_id', shuttleId),
  ])

  const myDirectBooking = shuttleBookings?.find(b => b.booker_id === user.id)
  if (myDirectBooking) redirect(`/base/navette/${shuttleId}?error=prenotazione-esistente`)

  const shuttleBookingIds = shuttleBookings?.map(b => b.id) ?? []
  const { data: existingParticipants } = shuttleBookingIds.length
    ? await supabaseAdmin
        .from('booking_participants')
        .select('user_id')
        .in('booking_id', shuttleBookingIds)
        .eq('is_guest', false)
    : { data: [] }

  const alreadyBookedIds = new Set([
    ...(shuttleBookings?.map(b => b.booker_id) ?? []),
    ...(existingParticipants ?? []).filter(p => p.user_id).map(p => p.user_id as string),
  ])

  if (alreadyBookedIds.has(user.id)) {
    redirect(`/base/navette/${shuttleId}?error=prenotazione-esistente`)
  }

  if (participantIds.some(id => alreadyBookedIds.has(id))) {
    redirect(`/base/navette/${shuttleId}?error=partecipante-già-prenotato`)
  }

  const { error: bookError } = await supabaseAdmin
    .rpc('book_seats', { p_shuttle_id: shuttleId, p_count: totalCount })

  if (bookError) {
    console.error('[createBooking] book_seats error:', bookError)
    if (bookError.message.includes('non prenotabile')) {
      redirect(`/base/navette/${shuttleId}?error=navetta-non-prenotabile`)
    }
    if (bookError.message.includes('Posti insufficienti')) {
      redirect(`/base/navette/${shuttleId}?error=posti-insufficienti`)
    }
    redirect(`/base/navette/${shuttleId}?error=errore-prenotazione`)
  }

  const { data: booking, error: insertError } = await supabaseAdmin
    .from('bookings')
    .insert({ shuttle_id: shuttleId, booker_id: user.id })
    .select('id')
    .single()

  if (insertError || !booking) {
    await supabaseAdmin.rpc('release_seats', { p_shuttle_id: shuttleId, p_count: totalCount })
    redirect(`/base/navette/${shuttleId}?error=errore-prenotazione`)
  }

  const rows = [
    ...allUserIds.map(uid => ({ booking_id: booking.id, user_id: uid, is_guest: false, guest_label: null })),
    ...guestNames.map(name => ({ booking_id: booking.id, user_id: null, guest_label: name, is_guest: true })),
  ]

  const { error: participantsError } = await supabaseAdmin
    .from('booking_participants')
    .insert(rows)

  if (participantsError) {
    console.error('[createBooking] participants error:', participantsError)
    await supabaseAdmin.from('bookings').delete().eq('id', booking.id)
    await supabaseAdmin.rpc('release_seats', { p_shuttle_id: shuttleId, p_count: totalCount })
    redirect(`/base/navette/${shuttleId}?error=errore-prenotazione`)
  }

  const shuttleAfter = await getShuttleSnapshot(shuttleId)
  if (shuttleBefore && shuttleAfter) {
    await sendBookingNotifications(shuttleId, shuttleBefore, shuttleAfter, user.id, 'Nuova prenotazione', 'notif_m2')
  }

  revalidatePath(`/base/navette/${shuttleId}`)
  redirect(`/base/navette/${shuttleId}?ok=1`)
}

export async function updateBooking(formData: FormData) {
  const { user } = await getCurrentUser()

  const bookingId = formData.get('booking_id') as string
  const shuttleId = formData.get('shuttle_id') as string
  const includeBooker = formData.get('include_booker') === 'on'
  const newParticipantIds = (formData.getAll('participant_ids') as string[])
    .filter(id => id && id !== user.id)
  const newGuestNames = (formData.getAll('guest_names') as string[])
    .map(g => g.trim()).filter(Boolean).slice(0, 20)

  if (newParticipantIds.length > 0) {
    const { data: masterCheck } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .in('id', newParticipantIds)
      .eq('role', 'master')
    if (masterCheck && masterCheck.length > 0) {
      redirect(`/base/navette/${shuttleId}?error=partecipante-non-valido`)
    }
  }

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

  const { data: currentParticipants } = await supabaseAdmin
    .from('booking_participants')
    .select('id')
    .eq('booking_id', bookingId)

  const oldCount = currentParticipants?.length ?? 0
  const allNewUserIds = includeBooker ? [user.id, ...newParticipantIds] : newParticipantIds
  const newCount = allNewUserIds.length + newGuestNames.length
  const delta = newCount - oldCount

  if (delta > 0) {
    const { error } = await supabaseAdmin.rpc('book_seats', {
      p_shuttle_id: booking.shuttle_id,
      p_count: delta,
    })
    if (error) {
      if (error.message.includes('Posti insufficienti')) {
        redirect(`/base/navette/${shuttleId}?error=posti-insufficienti`)
      }
      redirect(`/base/navette/${shuttleId}?error=errore-prenotazione`)
    }
  }

  await supabaseAdmin.from('booking_participants').delete().eq('booking_id', bookingId)

  const rows = [
    ...allNewUserIds.map(uid => ({ booking_id: bookingId, user_id: uid, is_guest: false, guest_label: null })),
    ...newGuestNames.map(name => ({ booking_id: bookingId, user_id: null, guest_label: name, is_guest: true })),
  ]

  const { error: insertError } = await supabaseAdmin.from('booking_participants').insert(rows)

  if (insertError) {
    if (delta > 0) {
      await supabaseAdmin.rpc('release_seats', { p_shuttle_id: booking.shuttle_id, p_count: delta })
    }
    redirect(`/base/navette/${shuttleId}?error=errore-prenotazione`)
  }

  if (delta < 0) {
    await supabaseAdmin.rpc('release_seats', {
      p_shuttle_id: booking.shuttle_id,
      p_count: Math.abs(delta),
    })
  }

  const shuttleAfter = await getShuttleSnapshot(shuttleId)
  if (shuttleBefore && shuttleAfter) {
    await sendBookingNotifications(shuttleId, shuttleBefore, shuttleAfter, user.id, 'Prenotazione modificata', 'notif_m3')
  }

  revalidatePath(`/base/navette/${shuttleId}`)
  redirect(`/base/navette/${shuttleId}?ok=modifica`)
}

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
    await sendBookingNotifications(shuttleId, shuttleBefore, shuttleAfter, user.id, 'Prenotazione cancellata', 'notif_m4')
  }

  revalidatePath(`/base/navette/${booking.shuttle_id}`)
  redirect(`/base/navette/${booking.shuttle_id}`)
}
