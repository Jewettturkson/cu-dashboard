import { supabase } from '@/lib/supabase'
import type { Transaction } from '@/lib/supabase'
import LogDepositButton from '@/components/LogDepositButton'

// Live data — always fetch fresh, never serve a build-time snapshot
export const dynamic = 'force-dynamic'

const formatGHS = (n: number) =>
  `GH₵ ${n.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`

const formatDateTime = (d: string) => {
  const dt = new Date(d)
  return dt.toLocaleDateString('en-GH', { day: 'numeric', month: 'short' }) +
    ' · ' + dt.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })
}

export default async function TransactionsPage() {
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*, clients(full_name, account_number), bankers(full_name)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return <p style={{ color: 'var(--danger)', padding: 20 }}>Error: {error.message}</p>

  const totalDeposits = (transactions ?? [])
    .filter(t => t.type === 'deposit')
    .reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: 'var(--text)', fontWeight: 700, fontSize: 24 }}>Transactions</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            {transactions?.length ?? 0} records · {formatGHS(totalDeposits)} deposited
          </p>
        </div>
        {/* Desktop — mobile uses bottom nav */}
        <div className="hidden md:block">
          <LogDepositButton />
        </div>
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
        {(transactions ?? []).length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No transactions yet.
          </div>
        ) : (
          (transactions ?? []).map((txn: Transaction, i: number) => (
            <div
              key={txn.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                height: 64,
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                gap: 12,
              }}
            >
              {/* Type badge */}
              <div
                style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: txn.type === 'deposit' ? '#d1fae5' : '#fff1f2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: txn.type === 'deposit' ? 'var(--success)' : 'var(--danger)',
                  fontWeight: 700, fontSize: 16,
                }}
              >
                {txn.type === 'deposit' ? '↑' : '↓'}
              </div>

              {/* Client + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: 'var(--text)', fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {(txn as any).clients?.full_name ?? '—'}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {txn.method === 'momo' ? 'MoMo' : 'Cash'}
                  {(txn as any).bankers?.full_name ? ` · ${(txn as any).bankers.full_name}` : ''}
                  {txn.notes ? ` · ${txn.notes}` : ''}
                </p>
              </div>

              {/* Amount + time */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p
                  style={{
                    fontWeight: 600, fontSize: 14, fontVariantNumeric: 'tabular-nums',
                    color: txn.type === 'deposit' ? 'var(--success)' : 'var(--danger)',
                  }}
                >
                  {txn.type === 'deposit' ? '+' : '-'}{formatGHS(Number(txn.amount))}
                </p>
                <p style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>
                  {formatDateTime(txn.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
