import { createClient } from '@/lib/supabase-server'
import CollectForm from '@/components/CollectForm'

// Live data — always fetch fresh, never serve a build-time snapshot
export const dynamic = 'force-dynamic'

// Banker collection screen: one screen, one action.
// Middleware confines banker-role users here; admins can visit too.
export default async function CollectPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, banker_id, full_name')
    .eq('id', user!.id)
    .single()

  // A banker login that isn't linked to a bankers row can't collect —
  // surface it clearly instead of failing on submit.
  if (profile?.role === 'banker' && !profile.banker_id) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 17 }}>Account not linked</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>
          This login isn&apos;t linked to a field officer record yet.
          Ask your admin to complete setup.
        </p>
      </div>
    )
  }

  const [{ data: clients }, { data: banker }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, full_name, account_number')
      .eq('is_active', true)
      .order('full_name'),
    profile?.banker_id
      ? supabase.from('bankers').select('id, full_name').eq('id', profile.banker_id).single()
      : Promise.resolve({ data: null }),
  ])

  return (
    <CollectForm
      clients={clients ?? []}
      bankerId={profile?.banker_id ?? null}
      bankerName={banker?.full_name ?? profile?.full_name ?? 'Field officer'}
      isAdmin={profile?.role === 'admin' || !profile}
    />
  )
}
