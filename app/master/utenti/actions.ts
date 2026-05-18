'use server'

import { getMasterUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const WORDS = [
  'Veloce', 'Forte', 'Verde', 'Felice', 'Rapido',
  'Grande', 'Nuovo', 'Lungo', 'Bravo', 'Sano',
  'Vento', 'Sole', 'Luna', 'Mare', 'Bosco',
  'Fiore', 'Ponte', 'Torre', 'Fiume', 'Monte',
]

function generatePassword(): string {
  const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)]
  const num = Math.floor(Math.random() * 90) + 10
  return `${pick()}${pick()}${num}`
}

export async function createUser(formData: FormData) {
  await getMasterUser()

  const username = (formData.get('username') as string ?? '').trim().toLowerCase()
  if (!username || !/^[a-z0-9_]{2,30}$/.test(username)) {
    redirect('/master/utenti/nuovo?error=username-non-valido')
  }

  const password = generatePassword()

  const { error } = await supabaseAdmin.auth.admin.createUser({
    email: `${username}@navette.internal`,
    password,
    email_confirm: true,
    user_metadata: { username, role: 'base' },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      redirect('/master/utenti/nuovo?error=username-esistente')
    }
    console.error('[createUser] Supabase error:', error)
    redirect('/master/utenti/nuovo?error=errore-creazione')
  }

  revalidatePath('/master/utenti')
  redirect(`/master/utenti/nuovo?ok=1&u=${encodeURIComponent(username)}&pw=${encodeURIComponent(password)}`)
}

export async function resetPassword(formData: FormData) {
  await getMasterUser()

  const id = formData.get('id') as string
  const username = formData.get('username') as string

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', id)
    .single()

  if (profile?.role === 'master') redirect(`/master/utenti/${id}`)

  const password = generatePassword()
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password })
  if (error) {
    console.error('[resetPassword] Supabase error:', error)
    redirect(`/master/utenti/${id}?error=errore-reset`)
  }

  redirect(`/master/utenti/${id}?ok=1&u=${encodeURIComponent(username)}&pw=${encodeURIComponent(password)}`)
}

export async function deleteUser(formData: FormData) {
  await getMasterUser()

  const id = formData.get('id') as string

  // Verifica che non sia un master prima di eliminare
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', id)
    .single()

  if (profile?.role === 'master') redirect('/master/utenti')

  const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (error) console.error('[deleteUser] Supabase error:', error)

  revalidatePath('/master/utenti')
  redirect('/master/utenti')
}
