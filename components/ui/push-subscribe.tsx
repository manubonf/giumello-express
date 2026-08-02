'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
}

export function PushSubscribe() {
  const [supported, setSupported] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [loading, setLoading] = useState(false)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscription(sub))
      .catch((err) => console.error('[PushSubscribe] SW registration failed:', err))
      .finally(() => {
        setSupported(true)
        if (Notification.permission === 'denied') setDenied(true)
      })
  }, [])

  if (!supported) return null

  if (denied) {
    return (
      <span
        className="rounded-lg border px-2.5 py-1 font-mono text-xs uppercase tracking-wide"
        style={{ borderColor: 'var(--border-muted)', color: 'var(--text-dim)' }}
        title="Notifiche bloccate dal browser — abilitale nelle impostazioni del sito"
      >
        🚫 Bloccate
      </span>
    )
  }

  async function subscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })
      setSubscription(sub)
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(JSON.parse(JSON.stringify(sub))),
      })
      if (!res.ok) console.error('[PushSubscribe] subscribe API error:', await res.text())
    } catch (err) {
      console.error('[PushSubscribe] subscribe failed:', err)
      if (Notification.permission === 'denied') setDenied(true)
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    if (!subscription) return
    setLoading(true)
    try {
      const endpoint = subscription.endpoint
      await subscription.unsubscribe()
      setSubscription(null)
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      })
    } catch (err) {
      console.error('[PushSubscribe] unsubscribe failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={subscription ? unsubscribe : subscribe}
      disabled={loading}
      title={subscription ? 'Disattiva notifiche' : 'Attiva notifiche'}
      className="rounded-lg border px-2.5 py-1 font-mono text-xs uppercase tracking-wide transition-colors"
      style={{
        background: 'none',
        borderColor: subscription ? 'var(--red-border)' : 'var(--border-muted)',
        color: subscription ? 'var(--red)' : 'var(--text-dim)',
        opacity: loading ? 0.5 : 1,
      }}
    >
      {subscription ? '🔔 ATTIVE' : '🔕 DISATTIVE'}
    </Button>
  )
}
