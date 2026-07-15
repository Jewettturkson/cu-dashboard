import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { Users, Banknote, TrendingUp, UserCheck } from 'lucide-react'
import LogDepositButton from '@/components/LogDepositButton'
import PendingWithdrawals from '@/components/PendingWithdrawals'

// Live dashboard — always fetch fresh data, never serve a build-time snapshot
export const dynamic = 'force-dynamic'

const formatGHS = (amount: number) =>
  `GH₵ ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })

export default async function DashboardPage() {
  const supabase = await createClient()

  // Whose union is this? Multi-tenant from migration 006 onward.
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('organizations(name)').eq('id', user.id).single()
    : { data: null }
  const orgName = (profile as { organizations?: { name: string } } | null)?.organizations?.name

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const [
    { count: totalClients },
    { count: activeBankers },
    { data: todayTxns },
    { data: monthTxns },
    { data: recentTxns },
    { data: pendingWithdrawals },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('bankers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('transactions').select('amount').eq('type', 'deposit').gte('created_at', today.toISOString()),
    supabase.from('transactions').select('amount').eq('type', 'deposit').gte('created_at', startOfMonth.toISOString()),
    supabase.from('transactions')
      .select('*, clients(full_name, account_number), bankers(full_name)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('withdrawal_requests')
      .select('id, amount, method, created_at, clients(full_name, account_number), bankers(full_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
  ])

  const todayTotal  = (todayTxns  ?? []).reduce((s, t) => s + Number(t.amount), 0)
  const monthTotal  = (monthTxns  ?? []).reduce((s, t) => s + Number(t.amount), 0)

  const stats = [
    { label: 'Total clients',     value: totalClients ?? 0,        icon: Users,      mono: false },
    { label: 'Collected today',   value: formatGHS(todayTotal),    icon: Banknote,   mono: true  },
    { label: 'This month',        value: formatGHS(monthTotal),    icon: TrendingUp, mono: true  },
    { label: 'Active bankers',    value: activeBankers ?? 0,       icon: UserCheck,  mono: false },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          {new Date().toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h1 style={{ color: 'var(--text)', fontWeight: 700, fontSize: 24, marginTop: 2 }}>
          {orgName ?? 'Dashboard'}
        </h1>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
        {stats.map(({ label, value, icon: Icon, mono }) => (
          <div
            key={label}
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-card)',
              padding: 16,
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                background: 'var(--surface-2)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
              }}
            >
              <Icon size={16} style={{ color: 'var(--accent)' }} />
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 2 }}>{label}</p>
            <p
              style={{
                color: 'var(--text)',
                fontWeight: 700,
                fontSize: 20,
                fontVariantNumeric: mono ? 'tabular-nums' : undefined,
              }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Log deposit — desktop only (mobile uses bottom nav) */}
      <div className="hidden md:flex justify-end mb-4">
        <LogDepositButton />
      </div>

      {/* Withdrawals awaiting approval — hidden when empty */}
      <PendingWithdrawals requests={(pendingWithdrawals as never[]) ?? []} />

      {/* Recent transactions */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ color: 'var(--text)', fontWeight: 600, fontSize: 17 }}>Recent activity</h2>
          {/* Mobile has no room for more tabs — these live here */}
          <div style={{ display: 'flex', gap: 14 }}>
            <Link href="/reconciliation" style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
              Daily report
            </Link>
            <Link href="/audit" style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
              Audit log
            </Link>
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
          {(recentTxns ?? []).length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              No transactions yet. Log your first deposit to get started.
            </div>
          ) : (
            (recentTxns ?? []).map((txn: any, i: number) => (
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
                {/* Avatar */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'var(--surface-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent)',
                    fontWeight: 700,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {txn.clients?.full_name?.charAt(0) ?? '?'}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'var(--text)', fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {txn.clients?.full_name ?? '—'}
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {txn.method === 'momo' ? 'MoMo' : 'Cash'}
                    {txn.bankers?.full_name ? ` · ${txn.bankers.full_name}` : ''}
                  </p>
                </div>

                {/* Amount + time */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p
                    style={{
                      color: txn.type === 'withdrawal' ? 'var(--danger)' : txn.type === 'opening' ? 'var(--accent)' : 'var(--success)',
                      fontWeight: 600,
                      fontSize: 14,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {txn.type === 'withdrawal' ? '-' : '+'}{formatGHS(Number(txn.amount))}
                  </p>
                  <p style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                    {formatDate(txn.created_at)} · {formatTime(txn.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
