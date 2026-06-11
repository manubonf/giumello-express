import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('user_favorites')
    .select('profiles!favorite_profile_id(id, username, role)')
    .eq('user_id', user.id)

  type FavoriteProfile = { id: string; username: string; role: string }
  const favorites = (data ?? [])
    .flatMap(row => {
      const p = row.profiles as FavoriteProfile | FavoriteProfile[] | null
      return Array.isArray(p) ? p : p ? [p] : []
    })
    .filter(p => p.role !== 'master')
    .map(p => ({ id: p.id, username: p.username }))

  return NextResponse.json(favorites)
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { profile_id } = await req.json() as { profile_id?: string }
  if (!profile_id) return NextResponse.json({ error: 'Missing profile_id' }, { status: 400 })

  const { error } = await supabase
    .from('user_favorites')
    .upsert({ user_id: user.id, favorite_profile_id: profile_id })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { profile_id } = await req.json() as { profile_id?: string }
  if (!profile_id) return NextResponse.json({ error: 'Missing profile_id' }, { status: 400 })

  await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('favorite_profile_id', profile_id)

  return NextResponse.json({ ok: true })
}
