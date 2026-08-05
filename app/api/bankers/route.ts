import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// POST /api/bankers — admin-only. Creates the bankers row, the
// auth login, and (via the on_auth_user_created trigger + a
// belt-and-braces insert) the profile row, atomically enough
// that a failure cleans up after itself.
//
// Requires SUPABASE_SERVICE_ROLE_KEY in the server environment.
// TODO(user): add SUPABASE_SERVICE_ROLE_KEY to Vercel env + .env.local
// (Supabase dashboard → Settings → API). Never expose it client-side.
export async function POST(request: Request) {
  const supabase = await createServerSupabase()

  // 1. Caller must be a signed-in admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 })
  }

  // 2. Validate input
  let body: { full_name?: string; phone?: string; employee_id?: string; email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const full_name = body.full_name?.trim()
  const phone = body.phone?.trim()
  const employee_id = body.employee_id?.trim() || null
  const email = body.email?.trim().toLowerCase()
  const password = body.password ?? ''
  if (!full_name || !phone || !email || password.length < 8) {
    return NextResponse.json(
      { error: 'full_name, phone, email and a password of at least 8 characters are required' },
      { status: 400 }
    )
  }

  // 3. Service-role client (bypasses RLS; used only server-side)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json(
      { error: 'Server not configured: SUPABASE_SERVICE_ROLE_KEY is missing. Add it in Vercel → Settings → Environment Variables.' },
      { status: 501 }
    )
  }
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 4. Create the bankers row first (we need its id for the profile link)
  const { data: banker, error: bankerErr } = await service
    .from('bankers')
    .insert({ full_name, phone, employee_id, org_id: profile.org_id })
    .select('id')
    .single()
  if (bankerErr) {
    const friendly = bankerErr.message.includes('bankers_phone_key')
      ? 'A banker with this phone number already exists.'
      : bankerErr.message.includes('bankers_employee_id_key')
        ? 'This employee ID is already taken.'
        : bankerErr.message
    return NextResponse.json({ error: friendly }, { status: 409 })
  }

  // 5. Create the login. The auth trigger provisions the profile
  //    from this metadata; we also insert directly as a fallback.
  const { data: created, error: authErr } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      org_id: profile.org_id,
      role: 'banker',
      full_name,
      banker_id: banker.id,
    },
  })
  if (authErr || !created.user) {
    await service.from('bankers').delete().eq('id', banker.id) // clean up the orphan row
    const friendly = authErr?.message?.includes('already been registered')
      ? 'A login with this email already exists.'
      : (authErr?.message ?? 'Could not create the login')
    return NextResponse.json({ error: friendly }, { status: 409 })
  }

  await service.from('profiles').upsert(
    { id: created.user.id, role: 'banker', org_id: profile.org_id, full_name, banker_id: banker.id },
    { onConflict: 'id' }
  )

  return NextResponse.json({ ok: true, banker_id: banker.id, email })
}
