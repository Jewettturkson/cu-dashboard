import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Session-aware Supabase client for Server Components.
// Carries the signed-in user's JWT so RLS policies apply —
// the plain anon client in lib/supabase.ts sees nothing once
// RLS is enabled.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // Server Components can't write cookies; middleware
          // handles session refresh, so ignoring is safe here.
        },
      },
    }
  )
}
