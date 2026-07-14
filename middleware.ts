import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

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
    // Role gate: bankers are confined to /collect. RLS enforces
    // this at the database too — this redirect is UX, not security.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role ?? 'admin' // no profile row yet → treat as admin (pre-migration)

    if (role === 'banker' && !isCollectPage) {
      return NextResponse.redirect(new URL('/collect', request.url))
    }

    // Already logged in → redirect away from login (banker case handled above)
    if (isLoginPage) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  // Run middleware on all routes except static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
