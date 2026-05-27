'use server'

import { getMasterUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendPush } from '@/lib/push'
import {
  baseIdsWithPref,
  sendStateChangePush,
  sendCancelledPush,
  shuttleBody,
} from '@/lib/notif'
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
  const { data: existingBookings } = await supabaseAdmin
    .from('bookings')
    .select('id, booker_id')
    .eq('shuttle_id', shuttleId)

  const bookerIds = new Set((existingBookings ?? []).map(b => b.booker_id))
  if (bookerIds.has(targetUserId)) {
    redirect(`/master/navette/${shuttleId}?error=partecipante-già-prenotato`)
  }

  const bookingIds = (existingBookings ?? []).map(b => b.id)
  if (bookingIds.length) {
    const { data: existingParticipant } = await supabaseAdmin
      .from('booking_participants')
      .select('id')
      .in('booking_id', bookingIds)
      .eq('user_id', targetUserId)
      .maybeSingle()
    if (existingParticipant) {
      redirect(`/master/navette/${shuttleId}?error=partecipante-già-prenotato`)
    }
  }

  const { error: bookError } = await supabaseAdmin.rpc('book_seats', {
    p_shuttle_id: shuttleId,
    p_count: 1,
  })
  if (bookError) {
    if (bookError.message.includes('Posti insufficienti')) redirect(`/master/navette/${shuttleId}?error=posti-insufficienti`)
    redirect(`/master/navette/${shuttleId}?error=errore-prenotazione`)
  }

  const { data: booking, error: insertError } = await supabaseAdmin
    .from('bookings')
    .insert({ shuttle_id: shuttleId, booker_id: master.id })
    .select('id')
    .single()

  if (insertError || !booking) {
    await supabaseAdmin.rpc('release_seats', { p_shuttle_id: shuttleId, p_count: 1 })
    redirect(`/master/navette/${shuttleId}?error=errore-prenotazione`)
  }

  const { error: partError } = await supabaseAdmin
    .from('booking_participants')
    .insert({ booking_id: booking.id, user_id: targetUserId, is_guest: false, guest_label: null })

  if (partError) {
    await supabaseAdmin.from('bookings').delete().eq('id', booking.id)
    await supabaseAdmin.rpc('release_seats', { p_shuttle_id: shuttleId, p_count: 1 })
    redirect(`/master/navette/${shuttleId}?error=errore-prenotazione`)
  }

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

  const { error: bookError } = await supabaseAdmin.rpc('book_seats', {
    p_shuttle_id: shuttleId,
    p_count: 1,
  })
  if (bookError) {
    if (bookError.message.includes('Posti insufficienti')) redirect(`/master/navette/${shuttleId}?error=posti-insufficienti`)
    redirect(`/master/navette/${shuttleId}?error=errore-prenotazione`)
  }

  const { data: booking, error: insertError } = await supabaseAdmin
    .from('bookings')
    .insert({ shuttle_id: shuttleId, booker_id: master.id })
    .select('id')
    .single()

  if (insertError || !booking) {
    await supabaseAdmin.rpc('release_seats', { p_shuttle_id: shuttleId, p_count: 1 })
    redirect(`/master/navette/${shuttleId}?error=errore-prenotazione`)
  }

  const { error: partError } = await supabaseAdmin
    .from('booking_participants')
    .insert({ booking_id: booking.id, user_id: null, is_guest: true, guest_label: guestName })

  if (partError) {
    await supabaseAdmin.from('bookings').delete().eq('id', booking.id)
    await supabaseAdmin.rpc('release_seats', { p_shuttle_id: shuttleId, p_count: 1 })
    redirect(`/master/navette/${shuttleId}?error=errore-prenotazione`)
  }

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

  const { count } = await supabaseAdmin
    .from('booking_participants')
    .select('id', { count: 'exact', head: true })
    .eq('booking_id', bookingId)

  await supabaseAdmin.from('bookings').delete().eq('id', bookingId)

  if ((count ?? 0) > 0) {
    await supabaseAdmin.rpc('release_seats', {
      p_shuttle_id: booking.shuttle_id,
      p_count: count!,
    })
  }

  revalidatePath(`/master/navette/${shuttleId}`)
  redirect(`/master/navette/${shuttleId}`)
}

export async function createShuttle(formData: FormData) {
  const user = await getMasterUser()

  const departureTime = (formData.get('departure_time') as string ?? '').trim()
  const maxSeats = parseInt(formData.get('max_seats') as string)
  const minSeatsRaw = (formData.get('min_seats') as string ?? '').trim()

  if (!departureTime || isNaN(maxSeats) || maxSeats < 1) {
    redirect('/master/navette/nuova?error=dati-non-validi')
  }

  let minSeats: number
  if (minSeatsRaw !== '') {
    minSeats = parseInt(minSeatsRaw)
    if (isNaN(minSeats) || minSeats < 0) {
      redirect('/master/navette/nuova?error=dati-non-validi')
    }
  } else {
    minSeats = 0
  }

  const isConfirmed = minSeats === 0

  const { data: shuttle, error } = await supabaseAdmin.from('shuttles').insert({
    departure_time: departureTime,
    max_seats: maxSeats,
    available_seats: maxSeats,
    min_seats: minSeats,
    created_by: user.id,
    status: isConfirmed ? 'confirmed' : 'draft',
  }).select('id').single()

  if (error || !shuttle) {
    console.error('[createShuttle] Supabase error:', error)
    redirect('/master/navette/nuova?error=errore-creazione')
  }

  // U2 (nuova navetta in bozza) or U3 (nuova navetta confermata direttamente)
  const pref = isConfirmed ? 'notif_u3' : 'notif_u2'
  const title = isConfirmed ? 'Nuova navetta confermata' : 'Nuova navetta disponibile (non ancora confermata)'
  const body = shuttleBody(departureTime, maxSeats, maxSeats)
  const shuttleId = shuttle.id

  after(async () => {
    const ids = await baseIdsWithPref(pref)
    if (ids.length) {
      await sendPush(ids, { title, body, url: `/base/navette/${shuttleId}` })
    }
  })

  revalidatePath('/master/navette')
  redirect('/master/navette')
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
    .update({ status: 'confirmed' })
    .eq('id', id)
    .eq('status', 'draft')

  if (shuttle) {
    const body = shuttleBody(shuttle.departure_time, shuttle.available_seats, shuttle.max_seats)
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
