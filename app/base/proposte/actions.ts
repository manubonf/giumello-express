'use server'

import { getCurrentUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { sendPush } from '@/lib/push'
import { masterIdsWithPref, baseIdsWithPref } from '@/lib/notif'
import { formatShort } from '@/lib/date'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'

export async function createProposal(formData: FormData) {
  const { user, profile } = await getCurrentUser()

  const departureTime = (formData.get('departure_time') as string ?? '').trim()
  const notes = (formData.get('notes') as string ?? '').trim() || null

  if (!departureTime) {
    redirect('/base/proposte/nuova?error=dati-non-validi')
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('proposals').insert({
    proposer_id: user.id,
    departure_time: departureTime,
    notes,
  })

  if (error) {
    console.error('[createProposal] error:', error)
    redirect('/base/proposte/nuova?error=errore-creazione')
  }

  const username = profile?.username ?? 'Qualcuno'
  const proposalBody = `${username} ha proposto per ${formatShort(departureTime)}`
  const userId = user.id

  after(async () => {
    const [masterIds, otherBaseIds] = await Promise.all([
      masterIdsWithPref('notif_m1'),
      baseIdsWithPref('notif_u1', [userId]),
    ])
    await Promise.all([
      masterIds.length
        ? sendPush(masterIds, { title: 'Nuova proposta', body: proposalBody, url: '/master/proposte' })
        : undefined,
      otherBaseIds.length
        ? sendPush(otherBaseIds, { title: 'Nuova proposta navetta', body: proposalBody, url: '/base/proposte' })
        : undefined,
    ])
  })

  revalidatePath('/base/proposte')
  redirect('/base/proposte?ok=1')
}
