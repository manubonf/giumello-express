'use server'

import { getCurrentUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createProposal(formData: FormData) {
  const { user } = await getCurrentUser()

  const departureTime = (formData.get('departure_time') as string ?? '').trim()
  const notes = (formData.get('notes') as string ?? '').trim() || null

  if (!departureTime) {
    redirect('/proposte/nuova?error=dati-non-validi')
  }

  // Usa il client utente per rispettare la RLS (proposer_id = auth.uid())
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('proposals').insert({
    proposer_id: user.id,
    departure_time: departureTime,
    notes,
  })

  if (error) {
    console.error('[createProposal] error:', error)
    redirect('/proposte/nuova?error=errore-creazione')
  }

  revalidatePath('/proposte')
  redirect('/proposte?ok=1')
}
