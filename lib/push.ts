import webpush from 'web-push'
import { supabaseAdmin } from './supabase'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

type PushPayload = { title: string; body: string; url?: string }

export async function sendPush(userIds: string[], payload: PushPayload) {
  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')
    .in('user_id', userIds)

  if (!subs?.length) return

  const notification = JSON.stringify(payload)

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        },
        notification,
        { timeout: 5000 },
      )
    )
  )

  // Rimuovi gli endpoint scaduti (410 Gone) o non trovati (404)
  const expiredEndpoints = subs
    .filter((_, i) => {
      const r = results[i]
      if (r.status !== 'rejected') return false
      const code = (r.reason as { statusCode?: number })?.statusCode
      return code === 410 || code === 404
    })
    .map((s) => s.endpoint)

  if (expiredEndpoints.length) {
    await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints)
  }

  // Log errori imprevisti (non 410/404)
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const code = (r.reason as { statusCode?: number })?.statusCode
      if (code !== 410 && code !== 404) {
        console.error('[sendPush] push error', code ?? r.reason, '— endpoint:', subs[i].endpoint.slice(-20))
      }
    }
  })
}
