import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Next 16 "proxy" convention (formerly middleware.ts).
// Auth + role gate for every route: unauthenticated → /login,
// unprovisioned (no profile row) → /login with message,
// banker role → confined to /collect. RLS enforces data access
// at the database; these redirects are UX, not security.
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh session — required for server components to stay in sync
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isLoginPage = pathname.startsWith('/login')
  const isCollectPage = pathname.startsWith('/collect')

  // Not logged in → redirect to login
  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Deny by default: an auth user with no profile row is
    // unprovisioned — send them to login with a clear message
    // instead of guessing a role.
    if (!profile) {
      if (!isLoginPage) {
        return NextResponse.redirect(new URL('/login?error=unprovisioned', request.url))
      }
      return response // let them see the login page + message
    }

    if (profile.role === 'banker' && !isCollectPage) {
      return NextResponse.redirect(new URL('/collect', request.url))
    }

    // Already logged in → redirect away from login
    if (isLoginPage) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  // Run on all routes except static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
