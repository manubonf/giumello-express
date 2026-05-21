'use server'

import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateProposal(formData: FormData) {
  const { user } = await getCurrentUser()

  const proposalId = formData.get('proposal_id') as string
  const departureTime = (formData.get('departure_time') as string ?? '').trim()
  const notes = (formData.get('notes') as string ?? '').trim() || null

  if (!departureTime) {
    redirect(`/base/proposte/${proposalId}?error=dati-non-validi`)
  }

  const { data: proposal } = await supabaseAdmin
    .from('proposals')
    .select('id, status')
    .eq('id', proposalId)
    .eq('proposer_id', user.id)
    .single()

  if (!proposal) redirect(`/base/proposte/${proposalId}?error=non-autorizzato`)
  if (proposal.status !== 'pending') redirect(`/base/proposte/${proposalId}?error=non-modificabile`)

  await supabaseAdmin
    .from('proposals')
    .update({ departure_time: departureTime, notes })
    .eq('id', proposalId)

  revalidatePath('/base/proposte')
  revalidatePath(`/base/proposte/${proposalId}`)
  redirect(`/base/proposte/${proposalId}?ok=1`)
}

export async function deleteProposal(formData: FormData) {
  const { user } = await getCurrentUser()

  const proposalId = formData.get('proposal_id') as string

  const { data: proposal } = await supabaseAdmin
    .from('proposals')
    .select('id, status')
    .eq('id', proposalId)
    .eq('proposer_id', user.id)
    .single()

  if (!proposal) redirect('/base/proposte?error=non-autorizzato')
  if (proposal.status !== 'pending') redirect(`/base/proposte/${proposalId}?error=non-modificabile`)

  await supabaseAdmin
    .from('proposals')
    .delete()
    .eq('id', proposalId)

  revalidatePath('/base/proposte')
  redirect('/base/proposte')
}
