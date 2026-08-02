import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

Deno.serve(async (req) => {
  // Verifica il secret condiviso
  const authHeader = req.headers.get('x-cron-secret')
  if (authHeader !== Deno.env.get('CRON_SECRET')) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Fascia oraria 8-21, ora di Roma
  const romeHour = Number(
    new Intl.DateTimeFormat('it-IT', {
      timeZone: 'Europe/Rome',
      hour: 'numeric',
      hour12: false,
    }).format(new Date())
  )
  if (romeHour < 8 || romeHour >= 21) {
    return new Response('Fuori fascia oraria', { status: 200 })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Conta le proposte pendenti
  const { count, error } = await supabaseAdmin
    .from('proposals')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (error) throw error
  if (!count || count === 0) {
    return new Response('Nessuna proposta pendente', { status: 200 })
  }

  // Recupera le subscription del master
const { data: master, error: masterError } = await supabaseAdmin
  .from('profiles')
  .select('id')
  .eq('role', 'master')
  .single()

if (masterError) throw masterError

// 3b. Recupera le subscription push di quell'utente
const { data: subs, error: subsError } = await supabaseAdmin
  .from('push_subscriptions')
  .select('endpoint, p256dh, auth_key')
  .eq('user_id', master.id)

if (subsError) throw subsError

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT'),
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!
  )

  const payload = JSON.stringify({
    title: 'Proposte in attesa',
    body: `Hai ${count} proposta${count > 1 ? 'e' : ''} in attesa di risposta`,
    url: '/master/proposte',
  })

  await Promise.all(
    (subs ?? []).map((row) =>
      webpush
        .sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth_key } },
          payload
        )
        .catch((err) => console.error('Push fallita:', err))
    )
  )

  return new Response(`Inviate notifiche: ${count} proposte pendenti`, { status: 200 })
})