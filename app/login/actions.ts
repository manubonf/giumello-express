'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const username = (formData.get('username') as string ?? '').trim().toLowerCase()
  const password = formData.get('password') as string

  if (!username || !password) {
    redirect('/login?error=credenziali-non-valide')
  }

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: `${username}@navette.internal`,
    password,
  })

  if (error) {
    redirect('/login?error=credenziali-non-valide')
  }

  redirect('/')
}

export async function logout() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}
