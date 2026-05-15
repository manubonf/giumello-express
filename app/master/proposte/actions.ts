'use server'

import { getMasterUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendPush } from '@/lib/push'
import { formatShort } from '@/lib/date'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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

  const { data: proposal } = await supabaseAdmin
    .from('proposals')
    .select('id, status, proposer_id')
    .eq('id', proposalId)
    .eq('status', 'pending')
    .single()

  if (!proposal) {
    redirect('/master/proposte?error=proposta-non-trovata')
  }

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

  await supabaseAdmin
    .from('proposals')
    .update({ status: 'accepted' })
    .eq('id', proposalId)

  await sendPush([proposal.proposer_id], {
    title: 'Proposta accettata',
    body: `La tua proposta per ${formatShort(departureTime)} è stata accettata!`,
    url: '/navette',
  })

  revalidatePath('/master/proposte')
  revalidatePath('/proposte')
  revalidatePath('/navette')
  revalidatePath('/master/navette')
  redirect('/master/proposte')
}

export async function rejectProposal(formData: FormData) {
  await getMasterUser()

  const proposalId = formData.get('proposal_id') as string

  const { data: proposal } = await supabaseAdmin
    .from('proposals')
    .select('proposer_id, departure_time')
    .eq('id', proposalId)
    .eq('status', 'pending')
    .single()

  await supabaseAdmin
    .from('proposals')
    .update({ status: 'rejected' })
    .eq('id', proposalId)
    .eq('status', 'pending')

  if (proposal) {
    await sendPush([proposal.proposer_id], {
      title: 'Proposta non accettata',
      body: `La proposta per ${formatShort(proposal.departure_time)} non è stata accettata.`,
      url: '/proposte',
    })
  }

  revalidatePath('/master/proposte')
  revalidatePath('/proposte')
  redirect('/master/proposte')
}
