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

  // Route pubbliche (login)
  if (pathname === '/login') {
    if (user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return response
  }

  // Tutto il resto richiede autenticazione
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname.startsWith('/master') || pathname.startsWith('/base')) {
    const role = await fetchUserRole(supabase, user.id)

    if (pathname.startsWith('/master') && role !== 'master') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    if (pathname.startsWith('/base') && role !== 'base') {
      return NextResponse.redirect(new URL('/master', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
