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

export async function updateUsername(formData: FormData) {
  await getMasterUser()

  const id = formData.get('id') as string
  const newUsername = (formData.get('username') as string ?? '').trim().toLowerCase()

  if (!newUsername || !/^[a-z0-9_]{2,30}$/.test(newUsername)) {
    redirect(`/master/utenti/${id}?error=username-non-valido`)
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', id)
    .single()

  if (!profile || profile.role === 'master') redirect(`/master/utenti/${id}`)

  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('username', newUsername)
    .neq('id', id)
    .maybeSingle()

  if (existing) redirect(`/master/utenti/${id}?error=username-esistente`)

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
    email: `${newUsername}@navette.internal`,
  })
  if (authError) {
    console.error('[updateUsername] Auth error:', authError)
    redirect(`/master/utenti/${id}?error=errore-salvataggio`)
  }

  await supabaseAdmin
    .from('profiles')
    .update({ username: newUsername })
    .eq('id', id)

  revalidatePath('/master/utenti')
  revalidatePath(`/master/utenti/${id}`)
  redirect(`/master/utenti/${id}?ok=username`)
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

export async function addAmmonizione(formData: FormData) {
  await getMasterUser()

  const userId = formData.get('user_id') as string
  const nota = (formData.get('nota') as string ?? '').trim()

  if (!nota) redirect(`/master/utenti/${userId}?error=nota-vuota`)

  const { error } = await supabaseAdmin
    .from('ammonizioni')
    .insert({ user_id: userId, nota })

  if (error) {
    console.error('[addAmmonizione] Supabase error:', error)
    redirect(`/master/utenti/${userId}?error=errore-salvataggio`)
  }

  revalidatePath(`/master/utenti/${userId}`)
  redirect(`/master/utenti/${userId}`)
}

export async function removeAmmonizione(formData: FormData) {
  await getMasterUser()

  const id = formData.get('id') as string
  const userId = formData.get('user_id') as string

  await supabaseAdmin.from('ammonizioni').delete().eq('id', id)

  revalidatePath(`/master/utenti/${userId}`)
  redirect(`/master/utenti/${userId}`)
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

  // ── 1. Libera i posti delle prenotazioni di cui l'utente è booker ──────────
  // auth.users → bookings CASCADE eliminerà queste righe, ma available_seats
  // va aggiornato prima che ciò avvenga.
  const { data: ownBookings } = await supabaseAdmin
    .from('bookings')
    .select('id, shuttle_id')
    .eq('booker_id', id)

  for (const booking of ownBookings ?? []) {
    const { count } = await supabaseAdmin
      .from('booking_participants')
      .select('*', { count: 'exact', head: true })
      .eq('booking_id', booking.id)
    if (count) {
      await supabaseAdmin.rpc('release_seats', { p_shuttle_id: booking.shuttle_id, p_count: count })
    }
  }

  // ── 2. Libera i posti delle prenotazioni altrui in cui l'utente è partecipante
  // profiles → booking_participants CASCADE (dopo migration) eliminerà queste
  // righe, ma available_seats va aggiornato prima. Le eliminiamo esplicitamente
  // per controllare l'ordine.
  const { data: otherParticipations } = await supabaseAdmin
    .from('booking_participants')
    .select('id, bookings!inner(shuttle_id, booker_id)')
    .eq('user_id', id)

  for (const p of otherParticipations ?? []) {
    const booking = p.bookings as unknown as { shuttle_id: string; booker_id: string }
    if (booking.booker_id !== id) {
      await supabaseAdmin.rpc('release_seats', { p_shuttle_id: booking.shuttle_id, p_count: 1 })
    }
    await supabaseAdmin.from('booking_participants').delete().eq('id', p.id)
  }

  // ── 3. Pre-elimina user_favorites (cascade cross-schema su profiles) ────────
  await supabaseAdmin.from('user_favorites').delete().eq('favorite_profile_id', id)

  const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (error) {
    console.error('[deleteUser] Supabase error:', JSON.stringify(error))
    const msg = encodeURIComponent(error.message ?? 'sconosciuto')
    redirect(`/master/utenti/${id}?error=errore-eliminazione&detail=${msg}`)
  }

  revalidatePath('/master/utenti')
  redirect('/master/utenti')
}
