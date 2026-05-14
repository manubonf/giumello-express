'use server'

import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getMasterUser() {
  const { user, profile } = await getCurrentUser()
  if (profile?.role !== 'master') redirect('/')
  return user
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
    if (isNaN(minSeats) || minSeats < 1) {
      redirect('/master/navette/nuova?error=dati-non-validi')
    }
  } else {
    const { data: settings } = await supabaseAdmin
      .from('app_settings')
      .select('min_interest_threshold')
      .single()
    minSeats = settings?.min_interest_threshold ?? 5
  }

  const { error } = await supabaseAdmin.from('shuttles').insert({
    departure_time: departureTime,
    max_seats: maxSeats,
    available_seats: maxSeats,
    min_seats: minSeats,
    created_by: user.id,
    status: 'draft',
  })

  if (error) {
    console.error('[createShuttle] Supabase error:', error)
    redirect('/master/navette/nuova?error=errore-creazione')
  }

  revalidatePath('/master/navette')
  redirect('/master/navette')
}

export async function confirmShuttle(formData: FormData) {
  await getMasterUser()
  const id = formData.get('id') as string

  await supabaseAdmin
    .from('shuttles')
    .update({ status: 'confirmed' })
    .eq('id', id)
    .eq('status', 'draft')

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

  await supabaseAdmin
    .from('shuttles')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .neq('status', 'done')

  revalidatePath('/master/navette')
  revalidatePath(`/master/navette/${id}`)
  redirect(`/master/navette/${id}`)
}
