'use server'

import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED_PREFS = new Set([
  'notif_u1', 'notif_u2', 'notif_u3', 'notif_u4', 'notif_u5',
  'notif_u6', 'notif_u7', 'notif_u8', 'notif_u9', 'notif_u10', 'notif_u11', 'notif_u12',
])

export async function updateBaseNotifPref(pref: string, enabled: boolean): Promise<void> {
  if (!ALLOWED_PREFS.has(pref)) return
  const { user } = await getCurrentUser()
  await supabaseAdmin.from('profiles').update({ [pref]: enabled }).eq('id', user.id)
}
