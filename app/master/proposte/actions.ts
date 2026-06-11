'use server'

import { getMasterUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { sendPush } from '@/lib/push'
import { userHasPref } from '@/lib/notif'
import { parseShuttleForm, createShuttleAndNotify } from '@/lib/shuttles'
import { formatShort } from '@/lib/date'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'

export async function acceptProposal(formData: FormData) {
  const user = await getMasterUser()

  const proposalId = formData.get('proposal_id') as string
  const form = parseShuttleForm(formData)
  if (!form) redirect(`/master/proposte/${proposalId}?error=dati-non-validi`)

  const { data: proposal } = await supabaseAdmin
    .from('proposals')
    .select('id, status, proposer_id')
    .eq('id', proposalId)
    .eq('status', 'pending')
    .single()

  if (!proposal) {
    redirect('/master/proposte?error=proposta-non-trovata')
  }

  const result = await createShuttleAndNotify(form, user.id, proposalId)
  if ('error' in result) redirect(`/master/proposte/${proposalId}?error=errore-creazione`)

  await supabaseAdmin
    .from('proposals')
    .update({ status: 'accepted' })
    .eq('id', proposalId)

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
  if (proposal) {
    after(async () => {
      if (await userHasPref(proposal.proposer_id, 'notif_u8')) {
        await sendPush([proposal.proposer_id], {
          title: 'Proposta non accettata',
          body: `La tua proposta per ${formatShort(proposal.departure_time)} non è stata accettata`,
          url: '/base/proposte',
        })
      }
    })
  }

  revalidatePath('/master/proposte')
  revalidatePath('/base/proposte')
  redirect('/master/proposte')
}
