'use server'

import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendPush } from '@/lib/push'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

async function getMasterUser() {
  const { user, profile } = await getCurrentUser()
  if (profile?.role !== 'master') redirect('/')
  return user
}

async function getShuttleBookerIds(shuttleId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('bookings')
    .select('booker_id')
    .eq('shuttle_id', shuttleId)
  return (data ?? []).map((b) => b.booker_id)
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

  const { data: shuttle } = await supabaseAdmin
    .from('shuttles')
    .select('departure_time')
    .eq('id', id)
    .single()

  await supabaseAdmin
    .from('shuttles')
    .update({ status: 'confirmed' })
    .eq('id', id)
    .eq('status', 'draft')

  if (shuttle) {
    const bookerIds = await getShuttleBookerIds(id)
    if (bookerIds.length) {
      await sendPush(bookerIds, {
        title: 'Navetta confermata',
        body: `La navetta del ${formatDate(shuttle.departure_time)} è confermata!`,
        url: `/navette/${id}`,
      })
    }
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
    const bookerIds = await getShuttleBookerIds(id)
    if (bookerIds.length) {
      await sendPush(bookerIds, {
        title: 'Navetta annullata',
        body: `La navetta del ${formatDate(shuttle.departure_time)} è stata annullata.`,
        url: '/navette',
      })
    }
  }

  revalidatePath('/master/navette')
  revalidatePath(`/master/navette/${id}`)
  redirect(`/master/navette/${id}`)
}
