import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Strip qualsiasi header x-user-* impostato dal client (spoofing prevention)
  const reqHeaders = new Headers(request.headers)
  reqHeaders.delete('x-user-id')
  reqHeaders.delete('x-user-role')
  reqHeaders.delete('x-user-username')

  // Accumula i cookie di sessione aggiornati da Supabase per applicarli dopo
  const cookieUpdates: Array<{ name: string; value: string; options: unknown }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            cookieUpdates.push({ name, value, options })
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Fetch profilo una volta sola (role + username) e iniettalo come header
  // della request — i Server Component lo leggono via getSessionFromHeaders()
  // senza toccare il DB.
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, username')
      .eq('id', user.id)
      .single()

    reqHeaders.set('x-user-id', user.id)
    reqHeaders.set('x-user-role', profile?.role ?? '')
    reqHeaders.set('x-user-username', profile?.username ?? '')
  }

  // Risposta con gli header aggiornati visibili ai Server Component
  let response = NextResponse.next({ request: { headers: reqHeaders } })

  // Applica i cookie di sessione rinnovati
  cookieUpdates.forEach(({ name, value, options }) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response.cookies.set(name as string, value as string, options as any)
  )

  // Copia i cookie di sessione nel redirect — senza questo, Safari perde
  // i token appena rinnovati su ogni redirect (es. / → /master).
  function redirect(url: string): NextResponse {
    const res = NextResponse.redirect(new URL(url, request.url))
    response.cookies.getAll().forEach(c => res.cookies.set(c.name, c.value, c))
    return res
  }

  if (pathname === '/login') {
    if (user) return redirect('/')
    return response
  }

  if (!user) return redirect('/login')

  const role = reqHeaders.get('x-user-role')

  if (pathname.startsWith('/master') && role !== 'master') return redirect('/')
  if (pathname.startsWith('/base') && role !== 'base') return redirect('/master')

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
