import { createClient } from '@/lib/supabase-server'
import type { Banker } from '@/lib/supabase'

// Live data — always fetch fresh, never serve a build-time snapshot
export const dynamic = 'force-dynamic'

export default async function BankersPage() {
  const supabase = await createClient()
  const [{ data: bankers, error }, { data: txnData }] = await Promise.all([
    supabase.from('bankers').select('*').order('full_name'),
    supabase.from('transactions').select('banker_id, amount, type'),
  ])

  if (error) return <p style={{ color: 'var(--danger)', padding: 20 }}>Error: {error.message}</p>

  // Build per-banker stats
  const statsMap: Record<string, { count: number; total: number }> = {}
  ;(txnData ?? []).forEach(t => {
    if (!t.banker_id) return
    if (!statsMap[t.banker_id]) statsMap[t.banker_id] = { count: 0, total: 0 }
    statsMap[t.banker_id].count += 1
    if (t.type === 'deposit') statsMap[t.banker_id].total += Number(t.amount)
  })

  const formatGHS = (n: number) =>
    `GH₵ ${n.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: 'var(--text)', fontWeight: 700, fontSize: 24 }}>Bankers</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
          {(bankers ?? []).filter(b => b.is_active).length} active field officers
        </p>
      </div>

      <div
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
        }}
      >
        {(bankers ?? []).length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No bankers yet.
          </div>
        ) : (
          (bankers ?? []).map((banker: Banker, i: number) => {
            const s = statsMap[banker.id] ?? { count: 0, total: 0 }
            return (
              <div
                key={banker.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                  height: 72,
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  gap: 12,
                }}
              >
                {/* Initials avatar */}
                <div
                  style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent)', fontWeight: 700, fontSize: 15,
                  }}
                >
                  {banker.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>

                {/* Name + ID + status */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'var(--text)', fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {banker.full_name}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <span style={{ color: 'var(--text-dim)', fontSize: 11, fontFamily: 'monospace' }}>
                      {banker.employee_id ?? '—'}
                    </span>
                    <span
                      style={{
                        display: 'inline-block',
                        background: banker.is_active ? '#d1fae5' : 'var(--surface)',
                        color: banker.is_active ? '#065f46' : 'var(--text-muted)',
                        fontSize: 10, fontWeight: 600,
                        padding: '1px 6px', borderRadius: 99,
                      }}
                    >
                      {banker.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
                    {formatGHS(s.total)}
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                    {s.count} {s.count === 1 ? 'txn' : 'txns'}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div
        style={{
          marginTop: 16,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          padding: '14px 16px',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}
      >
        <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>ℹ</span>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
          Amounts shown are total lifetime deposits collected by each banker.
          Add or deactivate bankers via the Supabase dashboard for now.
        </p>
      </div>
    </div>
  )
}
