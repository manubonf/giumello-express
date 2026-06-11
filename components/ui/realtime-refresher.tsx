'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export function RealtimeRefresher({ tables }: { tables: string[] }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    let channel = supabase.channel(`refresh-${tables.join('-')}`)
    for (const table of tables) {
      channel = channel.on(
        'postgres_changes' as never,
        { event: '*', schema: 'public', table },
        () => router.refresh(),
      )
    }
    channel.subscribe()

    return () => { supabase.removeChannel(channel) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
