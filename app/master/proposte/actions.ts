'use server'

import { getMasterUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendPush } from '@/lib/push'
import { baseIdsWithPref, userHasPref, shuttleBody } from '@/lib/notif'
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
    if (isNaN(minSeats) || minSeats < 0) {
      redirect(`/master/proposte/${proposalId}?error=dati-non-validi`)
    }
  } else {
    minSeats = 0
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

  const isConfirmed = minSeats === 0

  const { data: createdShuttle, error: shuttleError } = await supabaseAdmin.from('shuttles').insert({
    departure_time: departureTime,
    max_seats: maxSeats,
    available_seats: maxSeats,
    min_seats: minSeats,
    created_by: user.id,
    status: isConfirmed ? 'confirmed' : 'draft',
    proposal_id: proposalId,
  }).select('id').single()

  if (shuttleError || !createdShuttle) {
    console.error('[acceptProposal] shuttle insert error:', shuttleError)
    redirect(`/master/proposte/${proposalId}?error=errore-creazione`)
  }

  await supabaseAdmin
    .from('proposals')
    .update({ status: 'accepted' })
    .eq('id', proposalId)

  // U2 (bozza) or U3 (confermata direttamente) — a tutti gli utenti base con la pref attiva
  const pref = isConfirmed ? 'notif_u3' : 'notif_u2'
  const title = isConfirmed ? 'Nuova navetta confermata' : 'Nuova navetta disponibile (non ancora confermata)'
  const body = shuttleBody(departureTime, maxSeats, maxSeats)

  const ids = await baseIdsWithPref(pref)
  if (ids.length) {
    await sendPush(ids, { title, body, url: `/base/navette/${createdShuttle.id}` })
  }

  revalidatePath('/master/proposte')
  revalidatePath('/base/proposte')
  revalidatePath('/base/navette')
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

  // U8 — notifica solo al proponente, solo se ha la pref attiva
  if (proposal && await userHasPref(proposal.proposer_id, 'notif_u8')) {
    await sendPush([proposal.proposer_id], {
      title: 'Proposta non accettata',
      body: `La tua proposta per ${formatShort(proposal.departure_time)} non è stata accettata`,
      url: '/base/proposte',
    })
  }

  revalidatePath('/master/proposte')
  revalidatePath('/base/proposte')
  redirect('/master/proposte')
}
