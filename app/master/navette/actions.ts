'use server'

import { getMasterUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import {
  sendStateChangePush,
  sendTimeChangePush,
  sendCancelledPush,
  sendAddedToShuttlePush,
  sendRemovedFromShuttlePush,
  shuttleBody,
  stateChangeTitle,
} from '@/lib/notif'
import { getShuttleSnapshot, getBookedUserIds, createSingleBooking } from '@/lib/bookings'
import { parseShuttleForm, createShuttleAndNotify } from '@/lib/shuttles'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'

// ─── Azioni booking master ───────────────────────────────────────────────────

/**
 * Il master prenota un utente registrato (base).
 * Il master è il booker, l'utente target è il partecipante.
 */
export async function masterBookUser(formData: FormData) {
  const master = await getMasterUser()
  const shuttleId = formData.get('shuttle_id') as string
  const targetUserId = formData.get('user_id') as string

  if (!targetUserId) redirect(`/master/navette/${shuttleId}?error=utente-mancante`)

  // Il target deve essere un utente base
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', targetUserId)
    .single()

  if (!profile || profile.role === 'master') {
    redirect(`/master/navette/${shuttleId}?error=partecipante-non-valido`)
  }

  // Controlla unicità: il target non deve essere già booker o partecipante
  const bookedIds = await getBookedUserIds(shuttleId)
  if (bookedIds.has(targetUserId)) {
    redirect(`/master/navette/${shuttleId}?error=partecipante-già-prenotato`)
  }

  const result = await createSingleBooking(shuttleId, master.id, {
    user_id: targetUserId,
    is_guest: false,
    guest_label: null,
  })

  if ('error' in result) redirect(`/master/navette/${shuttleId}?error=${result.error}`)

  // U10: notifica il target che è stato prenotato
  after(async () => {
    const shuttle = await getShuttleSnapshot(shuttleId)
    if (shuttle) {
      await sendAddedToShuttlePush(targetUserId, shuttleId, shuttle.departure_time, shuttle.available_seats)
    }
  })

  revalidatePath(`/master/navette/${shuttleId}`)
  redirect(`/master/navette/${shuttleId}?ok=prenotazione`)
}

/**
 * Il master prenota un ospite esterno.
 */
export async function masterBookGuest(formData: FormData) {
  const master = await getMasterUser()
  const shuttleId = formData.get('shuttle_id') as string
  const guestName = (formData.get('guest_name') as string ?? '').trim()

  if (!guestName) redirect(`/master/navette/${shuttleId}?error=nome-ospite-mancante`)

  const result = await createSingleBooking(shuttleId, master.id, {
    user_id: null,
    is_guest: true,
    guest_label: guestName,
  })

  if ('error' in result) redirect(`/master/navette/${shuttleId}?error=${result.error}`)

  revalidatePath(`/master/navette/${shuttleId}`)
  redirect(`/master/navette/${shuttleId}?ok=prenotazione`)
}

/**
 * Il master cancella qualsiasi prenotazione (propria o altrui).
 */
export async function masterCancelBooking(formData: FormData) {
  await getMasterUser()
  const bookingId = formData.get('booking_id') as string
  const shuttleId = formData.get('shuttle_id') as string

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, shuttle_id')
    .eq('id', bookingId)
    .single()

  if (!booking) redirect(`/master/navette/${shuttleId}?error=non-trovato`)

  const [{ count: totalCount }, { data: participants }] = await Promise.all([
    supabaseAdmin
      .from('booking_participants')
      .select('id', { count: 'exact', head: true })
      .eq('booking_id', bookingId),
    supabaseAdmin
      .from('booking_participants')
      .select('user_id')
      .eq('booking_id', bookingId)
      .eq('is_guest', false),
  ])

  await supabaseAdmin.from('bookings').delete().eq('id', bookingId)

  if ((totalCount ?? 0) > 0) {
    await supabaseAdmin.rpc('release_seats', {
      p_shuttle_id: booking.shuttle_id,
      p_count: totalCount!,
    })
  }

  // U10: notifica i partecipanti registrati rimossi
  const removedUserIds = (participants ?? []).map(p => p.user_id).filter(Boolean) as string[]
  if (removedUserIds.length) {
    const sid = booking.shuttle_id
    after(async () => {
      const shuttle = await getShuttleSnapshot(sid)
      if (shuttle) {
        await Promise.all(
          removedUserIds.map(uid =>
            sendRemovedFromShuttlePush(uid, sid, shuttle.departure_time, shuttle.available_seats)
          )
        )
      }
    })
  }

  revalidatePath(`/master/navette/${shuttleId}`)
  redirect(`/master/navette/${shuttleId}`)
}

/**
 * Modifica i posti massimi e la soglia di conferma di una navetta attiva.
 * Ricalcola available_seats e aggiorna lo status se necessario.
 */
export async function updateShuttleCapacity(formData: FormData) {
  await getMasterUser()
  const shuttleId = formData.get('shuttle_id') as string
  const newMaxSeats = parseInt(formData.get('max_seats') as string)
  const newMinSeats = parseInt(formData.get('min_seats') as string)

  if (isNaN(newMaxSeats) || newMaxSeats < 1 || isNaN(newMinSeats) || newMinSeats < 0) {
    redirect(`/master/navette/${shuttleId}?error=dati-non-validi`)
  }

  const { data: shuttle } = await supabaseAdmin
    .from('shuttles')
    .select('max_seats, available_seats, status, departure_time')
    .eq('id', shuttleId)
    .single()

  if (!shuttle) redirect(`/master/navette/${shuttleId}?error=non-trovato`)
  if (shuttle.status === 'done' || shuttle.status === 'cancelled') {
    redirect(`/master/navette/${shuttleId}?error=navetta-non-modificabile`)
  }

  const booked = shuttle.max_seats - shuttle.available_seats
  if (newMaxSeats < booked) {
    redirect(`/master/navette/${shuttleId}?error=posti-occupati`)
  }

  const newAvailableSeats = newMaxSeats - booked

  // Aggiorna lo status in base alla nuova configurazione
  let newStatus: string = shuttle.status
  if (newAvailableSeats === 0) {
    newStatus = 'full'
  } else if (shuttle.status === 'full') {
    // Non è più piena: torna a confirmed o draft
    newStatus = booked >= newMinSeats ? 'confirmed' : 'draft'
  } else if (booked >= newMinSeats) {
    // Soglia raggiunta (o azzerata): conferma (gestisce sia draft→confirmed che lo resta se era confirmed)
    newStatus = 'confirmed'
  } else {
    // Soglia non raggiunta: torna/rimane in draft (gestisce anche confirmed→draft se soglia alzata)
    newStatus = 'draft'
  }

  await supabaseAdmin
    .from('shuttles')
    .update({
      max_seats: newMaxSeats,
      min_seats: newMinSeats,
      available_seats: newAvailableSeats,
      status: newStatus,
    })
    .eq('id', shuttleId)

  // Notifica cambio di stato (U4/U5) solo se lo stato è effettivamente cambiato
  if (newStatus !== shuttle.status) {
    const body = shuttleBody(shuttle.departure_time, newAvailableSeats)
    after(() => sendStateChangePush(shuttleId, stateChangeTitle(newStatus), body))
  }

  revalidatePath(`/master/navette/${shuttleId}`)
  redirect(`/master/navette/${shuttleId}?ok=capacita-aggiornata`)
}

export async function createShuttle(formData: FormData) {
  const user = await getMasterUser()

  const form = parseShuttleForm(formData)
  if (!form) redirect('/master/navette/nuova?error=dati-non-validi')

  const result = await createShuttleAndNotify(form, user.id)
  if ('error' in result) redirect('/master/navette/nuova?error=errore-creazione')

  revalidatePath('/master/navette')
  redirect('/master/navette')
}

export async function updateShuttleDepartureTime(formData: FormData) {
  await getMasterUser()
  const shuttleId = formData.get('shuttle_id') as string
  const newDepartureTime = (formData.get('departure_time') as string ?? '').trim()

  if (!newDepartureTime) {
    redirect(`/master/navette/${shuttleId}?error=orario-non-valido`)
  }

  const { data: shuttle } = await supabaseAdmin
    .from('shuttles')
    .select('status, available_seats, max_seats')
    .eq('id', shuttleId)
    .single()

  if (!shuttle) redirect(`/master/navette/${shuttleId}?error=non-trovato`)
  if (shuttle.status === 'done' || shuttle.status === 'cancelled') {
    redirect(`/master/navette/${shuttleId}?error=navetta-non-modificabile`)
  }

  await supabaseAdmin
    .from('shuttles')
    .update({ departure_time: newDepartureTime })
    .eq('id', shuttleId)

  const body = shuttleBody(newDepartureTime, shuttle.available_seats)
  after(() => sendTimeChangePush(shuttleId, body))

  revalidatePath('/master/navette')
  revalidatePath(`/master/navette/${shuttleId}`)
  redirect(`/master/navette/${shuttleId}?ok=orario-aggiornato`)
}

export async function confirmShuttle(formData: FormData) {
  await getMasterUser()
  const id = formData.get('id') as string

  const { data: shuttle } = await supabaseAdmin
    .from('shuttles')
    .select('departure_time, max_seats, available_seats')
    .eq('id', id)
    .single()

  await supabaseAdmin
    .from('shuttles')
    .update({ status: 'confirmed', min_seats: 0 })
    .eq('id', id)
    .eq('status', 'draft')

  if (shuttle) {
    const body = shuttleBody(shuttle.departure_time, shuttle.available_seats)
    after(() => sendStateChangePush(id, 'Navetta confermata', body))
  }

  revalidatePath('/master/navette')
  revalidatePath(`/master/navette/${id}`)
  redirect(`/master/navette/${id}`)
}

export async function markShuttleDone(formData: FormData) {
  await getMasterUser()
  const id = formData.get('id') as string

  await supabaseAdmin
    .from('shuttles')
    .update({ status: 'done' })
    .eq('id', id)
    .in('status', ['confirmed', 'full'])

  revalidatePath('/master/navette')
  revalidatePath(`/master/navette/${id}`)
  redirect(`/master/navette/${id}`)
}

export async function cancelShuttle(formData: FormData) {
  await getMasterUser()
  const id = formData.get('id') as string

  const { data: shuttle } = await supabaseAdmin
    .from('shuttles')
    .select('departure_time')
    .eq('id', id)
    .single()

  await supabaseAdmin
    .from('shuttles')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .neq('status', 'done')

  if (shuttle) {
    after(() => sendCancelledPush(id, shuttle.departure_time))
  }

  revalidatePath('/master/navette')
  revalidatePath(`/master/navette/${id}`)
  redirect(`/master/navette/${id}`)
}
