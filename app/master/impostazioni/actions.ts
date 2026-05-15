'use server'

import { getMasterUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateSettings(formData: FormData) {
  await getMasterUser()

  const raw = (formData.get('min_interest_threshold') as string ?? '').trim()
  const value = parseInt(raw)

  if (isNaN(value) || value < 1) {
    redirect('/master/impostazioni?error=valore-non-valido')
  }

  const { error } = await supabaseAdmin
    .from('app_settings')
    .update({ min_interest_threshold: value, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) {
    console.error('[updateSettings] Supabase error:', error)
    redirect('/master/impostazioni?error=errore-salvataggio')
  }

  revalidatePath('/master/impostazioni')
  redirect('/master/impostazioni?ok=1')
}
