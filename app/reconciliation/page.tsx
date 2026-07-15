import { createClient } from '@/lib/supabase-server'
import ReconToolbar from '@/components/ReconToolbar'

// Live data — always fetch fresh, never serve a build-time snapshot
export const dynamic = 'force-dynamic'

const formatGHS = (n: number) =>
  `GH₵ ${n.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`

type Row = {
  amount: number
  type: 'deposit' | 'withdrawal' | 'opening'
  method: 'cash' | 'momo'
  banker_id: string | null
  bankers: { full_name: string } | null
}

type BankerTotals = {
  name: string
  cashIn: number
  momoIn: number
  cashOut: number
  momoOut: number
  count: number
}

// End-of-day reconciliation: replaces the manual cash-count ritual.
// "Expected cash on hand" is what each banker should physically
// hand over: cash collected minus cash withdrawals they paid out.
export default async function ReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date } = await searchParams
  const day = date ?? new Date().toISOString().slice(0, 10)

  const supabase = await createClient()
  const { data: txns, error } = await supabase
    .from('transactions')
    .select('amount, type, method, banker_id, bankers(full_name)')
    .gte('created_at', `${day}T00:00:00`)
    .lte('created_at', `${day}T23:59:59.999`)

  if (error) return <p style={{ color: 'var(--danger)', padding: 20 }}>Error: {error.message}</p>

  // Group by banker (office/admin entries fall under "Office")
  const byBanker = new Map<string, BankerTotals>()
  for (const t of (txns as unknown as Row[]) ?? []) {
    if (t.type === 'opening') continue  // migrated balances aren't cash a banker handled
    const key = t.banker_id ?? 'office'
    const entry = byBanker.get(key) ?? {
      name: t.bankers?.full_name ?? 'Office / no banker',
      cashIn: 0, momoIn: 0, cashOut: 0, momoOut: 0, count: 0,
    }
    const amt = Number(t.amount)
    if (t.type === 'deposit') {
      if (t.method === 'cash') entry.cashIn += amt
      else entry.momoIn += amt
    } else {
      if (t.method === 'cash') entry.cashOut += amt
      else entry.momoOut += amt
    }
    entry.count += 1
    byBanker.set(key, entry)
  }

  const rows = [...byBanker.values()].sort((a, b) => a.name.localeCompare(b.name))
  const total = rows.reduce(
    (acc, r) => ({
      cashIn: acc.cashIn + r.cashIn,
      momoIn: acc.momoIn + r.momoIn,
      cashOut: acc.cashOut + r.cashOut,
      momoOut: acc.momoOut + r.momoOut,
      count: acc.count + r.count,
    }),
    { cashIn: 0, momoIn: 0, cashOut: 0, momoOut: 0, count: 0 }
  )

  const displayDate = new Date(`${day}T12:00:00`).toLocaleDateString('en-GH', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const cell = { padding: '10px 12px', fontSize: 13, fontVariantNumeric: 'tabular-nums' as const }

  return (
    <div>
      {/* Hide app chrome when printing — the report is the artifact */}
      <style>{`@media print { header, nav, .no-print { display: none !important } body { background: #fff } }`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ color: 'var(--text)', fontWeight: 700, fontSize: 24 }}>Daily reconciliation</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{displayDate}</p>
        </div>
        <ReconToolbar date={day} />
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
        {total.count} transaction{total.count === 1 ? '' : 's'} recorded.
      </p>

      {rows.length === 0 ? (
        <div style={{
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)', padding: '48px 20px',
          textAlign: 'center', color: 'var(--text-muted)', fontSize: 14,
        }}>
          No transactions on this day.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {rows.map(r => {
            const expectedCash = r.cashIn - r.cashOut
            return (
              <div key={r.name} style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-card)', overflow: 'hidden',
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', borderBottom: '1px solid var(--border)',
                }}>
                  <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15 }}>{r.name}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.count} txns</p>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ ...cell, color: 'var(--text-secondary)' }}>Cash collected</td>
                      <td style={{ ...cell, textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>{formatGHS(r.cashIn)}</td>
                    </tr>
                    <tr>
                      <td style={{ ...cell, color: 'var(--text-secondary)' }}>MoMo collected</td>
                      <td style={{ ...cell, textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>{formatGHS(r.momoIn)}</td>
                    </tr>
                    <tr>
                      <td style={{ ...cell, color: 'var(--text-secondary)' }}>Cash paid out</td>
                      <td style={{ ...cell, textAlign: 'right', color: 'var(--danger)', fontWeight: 600 }}>−{formatGHS(r.cashOut)}</td>
                    </tr>
                    {r.momoOut > 0 && (
                      <tr>
                        <td style={{ ...cell, color: 'var(--text-secondary)' }}>MoMo paid out</td>
                        <td style={{ ...cell, textAlign: 'right', color: 'var(--danger)', fontWeight: 600 }}>−{formatGHS(r.momoOut)}</td>
                      </tr>
                    )}
                    <tr style={{ borderTop: '2px solid var(--border)' }}>
                      <td style={{ ...cell, color: 'var(--text)', fontWeight: 700 }}>Expected cash on hand</td>
                      <td style={{ ...cell, textAlign: 'right', color: 'var(--text)', fontWeight: 700, fontSize: 15 }}>
                        {formatGHS(expectedCash)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          })}

          {/* Union totals */}
          <div style={{
            background: 'var(--accent)', borderRadius: 'var(--radius-card)', padding: '16px 20px',
          }}>
            <p style={{ color: 'rgba(249,250,251,0.75)', fontSize: 13, fontWeight: 500 }}>
              Union total — expected cash on hand
            </p>
            <p style={{ color: '#f9fafb', fontWeight: 700, fontSize: 26, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
              {formatGHS(total.cashIn - total.cashOut)}
            </p>
            <p style={{ color: 'rgba(249,250,251,0.75)', fontSize: 12, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
              Deposits {formatGHS(total.cashIn + total.momoIn)} · Withdrawals {formatGHS(total.cashOut + total.momoOut)} · MoMo (no cash) {formatGHS(total.momoIn)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
