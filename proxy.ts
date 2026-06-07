import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { fetchUserRole } from '@/lib/auth'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        }
      }
    }
  )

  // Aggiorna la sessione (rinnova il token se scaduto)
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Copia i cookie di sessione aggiornati nel redirect — senza questo, Safari
  // perde i token appena rinnovati ogni volta che il middleware fa un redirect
  // (es. / → /master) e alla richiesta successiva risulta sloggato.
  function redirect(url: string): NextResponse {
    const res = NextResponse.redirect(new URL(url, request.url))
    response.cookies.getAll().forEach(c => res.cookies.set(c.name, c.value, c))
    return res
  }

  // Route pubbliche (login)
  if (pathname === '/login') {
    if (user) return redirect('/')
    return response
  }

  // Tutto il resto richiede autenticazione
  if (!user) return redirect('/login')

  if (pathname.startsWith('/master') || pathname.startsWith('/base')) {
    const role = await fetchUserRole(supabase, user.id)

    if (pathname.startsWith('/master') && role !== 'master') return redirect('/')
    if (pathname.startsWith('/base') && role !== 'base') return redirect('/master')
  }

  return response
}

export const config = {
  matcher: [
  '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
]
}
