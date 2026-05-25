import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { endpoint, keys } = body as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
  if (!endpoint || typeof endpoint !== 'string' || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth_key: keys.auth,
    },
    { onConflict: 'endpoint' }
  )

  if (error) {
    console.error('[push/subscribe] upsert error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { endpoint } = body as { endpoint?: string }
  if (!endpoint || typeof endpoint !== 'string') {
    return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  if (error) {
    console.error('[push/subscribe] delete error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
