'use server'

import { getCurrentUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getProfileIdsByRole } from '@/lib/data'
import { sendPush } from '@/lib/push'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

export async function createProposal(formData: FormData) {
  const { user } = await getCurrentUser()

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

  const masterIds = await getProfileIdsByRole('master')
  if (masterIds.length) {
    await sendPush(masterIds, {
      title: 'Nuova proposta',
      body: `Proposta per ${formatDate(departureTime)}`,
      url: '/master/proposte',
    })
  }

  revalidatePath('/base/proposte')
  redirect('/base/proposte?ok=1')
}
