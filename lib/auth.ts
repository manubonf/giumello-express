import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

// Legge i dati utente iniettati dal middleware via header HTTP.
// Zero query DB — usare al posto di getCurrentUser() nei Server Component.
export async function getSessionFromHeaders() {
  const h = await headers()
  return {
    userId:   h.get('x-user-id')       ?? '',
    role:     h.get('x-user-role')     ?? '',
    username: h.get('x-user-username') ?? '',
  }
}

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

export async function getMasterUser() {
  const { user, profile } = await getCurrentUser()
  if (profile?.role !== 'master') redirect('/')
  return user
}