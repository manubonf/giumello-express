'use server'

import { getMasterUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED_PREFS = new Set([
  'notif_m1', 'notif_m2', 'notif_m3', 'notif_m4', 'notif_m5', 'notif_m6',
])

export async function updateMasterNotifPref(pref: string, enabled: boolean): Promise<void> {
  if (!ALLOWED_PREFS.has(pref)) return
  const user = await getMasterUser()
  await supabaseAdmin.from('profiles').update({ [pref]: enabled }).eq('id', user.id)
}
