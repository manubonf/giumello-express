import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, role')
    .eq('id', user.id)
    .single()

  return { user, profile }
}

export async function requireMaster() {
  const { profile } = await getCurrentUser()

  if (profile?.role !== 'master') {
    redirect('/')
  }

  return profile
}

export async function getMasterUser() {
  const { user, profile } = await getCurrentUser()
  if (profile?.role !== 'master') redirect('/')
  return user
}