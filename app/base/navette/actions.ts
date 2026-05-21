'use server'

import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createBooking(formData: FormData) {
  const { user } = await getCurrentUser()

  const shuttleId = formData.get('shuttle_id') as string
  const participantIds = (formData.getAll('participant_ids') as string[])
    .filter(id => id && id !== user.id)
  const guestsRaw = (formData.get('guests') as string ?? '').trim()
  const guestNames = guestsRaw
    ? guestsRaw.split('\n').map(g => g.trim()).filter(Boolean).slice(0, 20)
    : []

  // Booker è sempre incluso; deduplicazione degli altri utenti
  const allUserIds = [user.id, ...participantIds]
  const totalCount = allUserIds.length + guestNames.length

  // Verifica prenotazione esistente (come booker o come partecipante)
  const { data: shuttleBookings } = await supabaseAdmin
    .from('bookings')
    .select('id, booker_id')
    .eq('shuttle_id', shuttleId)

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

  // Prenota posti atomicamente
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

  // Crea il record booking
  const { data: booking, error: insertError } = await supabaseAdmin
    .from('bookings')
    .insert({ shuttle_id: shuttleId, booker_id: user.id })
    .select('id')
    .single()

  if (insertError || !booking) {
    await supabaseAdmin.rpc('release_seats', { p_shuttle_id: shuttleId, p_count: totalCount })
    redirect(`/base/navette/${shuttleId}?error=errore-prenotazione`)
  }

  // Crea i partecipanti
  const rows = [
    ...allUserIds.map(uid => ({ booking_id: booking.id, user_id: uid, is_guest: false })),
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

  revalidatePath(`/base/navette/${shuttleId}`)

  redirect(`/base/navette/${shuttleId}?ok=1`)
}

export async function updateBooking(formData: FormData) {
  const { user } = await getCurrentUser()

  const bookingId = formData.get('booking_id') as string
  const shuttleId = formData.get('shuttle_id') as string
  const newParticipantIds = (formData.getAll('participant_ids') as string[])
    .filter(id => id && id !== user.id)
  const guestsRaw = (formData.get('guests') as string ?? '').trim()
  const newGuestNames = guestsRaw
    ? guestsRaw.split('\n').map(g => g.trim()).filter(Boolean).slice(0, 20)
    : []

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, booker_id, shuttle_id')
    .eq('id', bookingId)
    .eq('booker_id', user.id)
    .single()

  if (!booking) redirect(`/base/navette/${shuttleId}?error=non-autorizzato`)

  const { data: currentParticipants } = await supabaseAdmin
    .from('booking_participants')
    .select('id')
    .eq('booking_id', bookingId)

  const oldCount = currentParticipants?.length ?? 0
  const allNewUserIds = [user.id, ...newParticipantIds]
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
    ...allNewUserIds.map(uid => ({ booking_id: bookingId, user_id: uid, is_guest: false })),
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

  revalidatePath(`/base/navette/${shuttleId}`)
  redirect(`/base/navette/${shuttleId}?ok=modifica`)
}

export async function cancelBooking(formData: FormData) {
  const { user } = await getCurrentUser()

  const bookingId = formData.get('booking_id') as string
  const shuttleId = formData.get('shuttle_id') as string

  // Verifica proprietà e conta partecipanti
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, booker_id, shuttle_id')
    .eq('id', bookingId)
    .eq('booker_id', user.id)
    .single()

  if (!booking) redirect(`/base/navette/${shuttleId}?error=non-autorizzato`)

  const { count } = await supabaseAdmin
    .from('booking_participants')
    .select('id', { count: 'exact', head: true })
    .eq('booking_id', bookingId)

  const participantCount = count ?? 0

  // Elimina prenotazione (cascade su booking_participants)
  await supabaseAdmin.from('bookings').delete().eq('id', bookingId)

  // Rilascia posti
  if (participantCount > 0) {
    await supabaseAdmin.rpc('release_seats', {
      p_shuttle_id: booking.shuttle_id,
      p_count: participantCount,
    })
  }

  revalidatePath(`/base/navette/${booking.shuttle_id}`)

  redirect(`/base/navette/${booking.shuttle_id}`)
}
