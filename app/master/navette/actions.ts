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

  const ids = await baseIdsWithPref(pref)
  if (ids.length) {
    await sendPush(ids, { title, body, url: `/base/navette/${shuttle.id}` })
  }

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
    await sendStateChangePush(id, 'Navetta confermata', body)
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
    await sendCancelledPush(id, shuttle.departure_time)
  }

  revalidatePath('/master/navette')
  revalidatePath(`/master/navette/${id}`)
  redirect(`/master/navette/${id}`)
}
