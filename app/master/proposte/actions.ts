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

export async function acceptProposal(formData: FormData) {
  const user = await getMasterUser()

  const proposalId = formData.get('proposal_id') as string
  const departureTime = (formData.get('departure_time') as string ?? '').trim()
  const maxSeats = parseInt(formData.get('max_seats') as string)
  const minSeatsRaw = (formData.get('min_seats') as string ?? '').trim()

  if (!departureTime || isNaN(maxSeats) || maxSeats < 1) {
    redirect(`/master/proposte/${proposalId}?error=dati-non-validi`)
  }

  let minSeats: number
  if (minSeatsRaw !== '') {
    minSeats = parseInt(minSeatsRaw)
    if (isNaN(minSeats) || minSeats < 1) {
      redirect(`/master/proposte/${proposalId}?error=dati-non-validi`)
    }
  } else {
    const { data: settings } = await supabaseAdmin
      .from('app_settings')
      .select('min_interest_threshold')
      .single()
    minSeats = settings?.min_interest_threshold ?? 5
  }

  // Verifica che la proposta esista ed sia pending
  const { data: proposal } = await supabaseAdmin
    .from('proposals')
    .select('id, status')
    .eq('id', proposalId)
    .eq('status', 'pending')
    .single()

  if (!proposal) {
    redirect('/master/proposte?error=proposta-non-trovata')
  }

  // Crea la navetta in bozza collegata alla proposta
  const { error: shuttleError } = await supabaseAdmin.from('shuttles').insert({
    departure_time: departureTime,
    max_seats: maxSeats,
    available_seats: maxSeats,
    min_seats: minSeats,
    created_by: user.id,
    status: 'draft',
    proposal_id: proposalId,
  })

  if (shuttleError) {
    console.error('[acceptProposal] shuttle insert error:', shuttleError)
    redirect(`/master/proposte/${proposalId}?error=errore-creazione`)
  }

  // Segna la proposta come accettata
  await supabaseAdmin
    .from('proposals')
    .update({ status: 'accepted' })
    .eq('id', proposalId)

  revalidatePath('/master/proposte')
  revalidatePath('/proposte')
  revalidatePath('/navette')
  revalidatePath('/master/navette')
  redirect('/master/proposte')
}

export async function rejectProposal(formData: FormData) {
  await getMasterUser()

  const proposalId = formData.get('proposal_id') as string

  await supabaseAdmin
    .from('proposals')
    .update({ status: 'rejected' })
    .eq('id', proposalId)
    .eq('status', 'pending')

  revalidatePath('/master/proposte')
  revalidatePath('/proposte')
  redirect('/master/proposte')
}
