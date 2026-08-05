import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// PATCH /api/bankers/[id] — admin-only activate/deactivate.
// Deactivating also bans the banker's login (they can't sign in),
// and reactivating lifts the ban. The bankers row itself is
// updated through the caller's session, so org-scoped RLS applies.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabase()

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

  let body: { is_active?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (typeof body.is_active !== 'boolean') {
    return NextResponse.json({ error: 'is_active (boolean) is required' }, { status: 400 })
  }

  // RLS-scoped update: admins can only touch bankers in their org
  const { data: updated, error: updErr } = await supabase
    .from('bankers')
    .update({ is_active: body.is_active })
    .eq('id', id)
    .select('id')
    .single()
  if (updErr || !updated) {
    return NextResponse.json({ error: updErr?.message ?? 'Banker not found' }, { status: 404 })
  }

  // Ban/unban the linked login so deactivation actually locks them out.
  // Requires the service key; without it we still flip is_active and warn.
  // TODO(user): add SUPABASE_SERVICE_ROLE_KEY to Vercel env + .env.local
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  let loginLocked = false
  if (serviceKey) {
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: linked } = await service
      .from('profiles')
      .select('id')
      .eq('banker_id', id)
      .maybeSingle()
    if (linked) {
      const { error: banErr } = await service.auth.admin.updateUserById(linked.id, {
        ban_duration: body.is_active ? 'none' : '87600h', // ~10 years
      })
      loginLocked = !banErr
    }
  }

  return NextResponse.json({
    ok: true,
    is_active: body.is_active,
    login_locked: loginLocked,
    warning: serviceKey
      ? undefined
      : 'Banker status updated, but the login was not locked/unlocked: SUPABASE_SERVICE_ROLE_KEY is not configured.',
  })
}
