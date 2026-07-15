import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowDownCircle, ArrowUpCircle, Clock, Wifi, Phone, MapPin } from 'lucide-react'

// Live data — always fetch fresh, never serve a build-time snapshot
export const dynamic = 'force-dynamic'

type Txn = {
  id: string
  amount: number
  type: 'deposit' | 'withdrawal' | 'opening'
  method: 'cash' | 'momo'
  notes: string | null
  created_at: string
  bankers: { full_name: string } | null
}

const formatGHS = (n: number) =>
  `GH₵ ${n.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`

const formatDateTime = (d: string) => {
  const dt = new Date(d)
  return dt.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + dt.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: client }, { data: txns }, { data: pending }] = await Promise.all([
    supabase.from('clients').select('*, accounts(balance)').eq('id', id).single(),
    supabase
      .from('transactions')
      .select('id, amount, type, method, notes, created_at, bankers(full_name)')
      .eq('client_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('withdrawal_requests')
      .select('id, amount, method, created_at')
      .eq('client_id', id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
  ])

  if (!client) notFound()

  const balance = client.accounts?.[0]?.balance ?? 0

  // Running balance: walk the ledger oldest-first, then show newest-first
  let running = 0
  const timeline = ((txns as unknown as Txn[]) ?? []).map(t => {
    running += t.type === 'withdrawal' ? -Number(t.amount) : Number(t.amount)
    return { ...t, balanceAfter: running }
  }).reverse()

  return (
    <div>
      {/* Back */}
      <Link href="/clients" style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
        ← Clients
      </Link>

      {/* Profile header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16, marginBottom: 20 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', background: 'var(--surface-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent)', fontWeight: 700, fontSize: 20, flexShrink: 0,
        }}>
          {client.full_name.charAt(0)}
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ color: 'var(--text)', fontWeight: 700, fontSize: 22 }}>{client.full_name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: 12, fontFamily: 'monospace' }}>
              {client.account_number ?? '—'}
            </span>
            {client.momo_number && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--warning)', fontSize: 12 }}>
                <Wifi size={11} /> MoMo
              </span>
            )}
            <span
              style={{
                display: 'inline-block',
                background: client.is_active ? '#d1fae5' : 'var(--surface)',
                color: client.is_active ? '#065f46' : 'var(--text-muted)',
                fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 99,
              }}
            >
              {client.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Balance card */}
      <div style={{
        background: 'var(--accent)', borderRadius: 'var(--radius-card)',
        padding: '20px 24px', marginBottom: 16,
      }}>
        <p style={{ color: 'rgba(249,250,251,0.75)', fontSize: 13, fontWeight: 500 }}>Current balance</p>
        <p style={{ color: '#f9fafb', fontWeight: 700, fontSize: 30, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
          {formatGHS(Number(balance))}
        </p>
      </div>

      {/* Contact details */}
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)', padding: '14px 20px', marginBottom: 24,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 13 }}>
          <Phone size={14} style={{ color: 'var(--text-dim)' }} />
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{client.phone}</span>
          {client.momo_number && client.momo_number !== client.phone && (
            <span style={{ color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
              · MoMo {client.momo_number}
            </span>
          )}
        </div>
        {client.address && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 13 }}>
            <MapPin size={14} style={{ color: 'var(--text-dim)' }} />
            {client.address}
          </div>
        )}
      </div>

      {/* Pending withdrawals for this client */}
      {(pending ?? []).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ color: 'var(--text)', fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Pending withdrawals</h2>
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
            {(pending ?? []).map((p, i) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                borderTop: i === 0 ? 'none' : '1px solid #fed7aa',
              }}>
                <Clock size={16} style={{ color: 'var(--warning)' }} />
                <span style={{ color: 'var(--text)', fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {formatGHS(Number(p.amount))}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  awaiting approval · {formatDateTime(p.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <h2 style={{ color: 'var(--text)', fontWeight: 600, fontSize: 17, marginBottom: 12 }}>
        History
        <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
          {timeline.length} transaction{timeline.length === 1 ? '' : 's'}
        </span>
      </h2>

      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-card)', overflow: 'hidden',
      }}>
        {timeline.map((t, i) => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 20px', minHeight: 64,
            borderTop: i === 0 ? 'none' : '1px solid var(--border)',
          }}>
            {t.type === 'withdrawal'
              ? <ArrowUpCircle size={20} style={{ color: 'var(--danger)', flexShrink: 0 }} />
              : <ArrowDownCircle size={20} style={{ color: t.type === 'opening' ? 'var(--accent)' : 'var(--success)', flexShrink: 0 }} />}

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>
                {t.type === 'deposit' ? 'Deposit' : t.type === 'opening' ? 'Opening balance' : 'Withdrawal'}
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                  {t.type !== 'opening' && ` · ${t.method === 'momo' ? 'MoMo' : 'Cash'}`}
                  {t.bankers?.full_name ? ` · ${t.bankers.full_name}` : ''}
                </span>
              </p>
              <p style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 1 }}>
                {formatDateTime(t.created_at)}
                {t.notes ? ` — ${t.notes}` : ''}
              </p>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{
                color: t.type === 'withdrawal' ? 'var(--danger)' : t.type === 'opening' ? 'var(--accent)' : 'var(--success)',
                fontWeight: 600, fontSize: 14, fontVariantNumeric: 'tabular-nums',
              }}>
                {t.type === 'withdrawal' ? '−' : '+'}{formatGHS(Number(t.amount))}
              </p>
              <p style={{ color: 'var(--text-dim)', fontSize: 11, fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>
                bal {formatGHS(t.balanceAfter)}
              </p>
            </div>
          </div>
        ))}

        {timeline.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No transactions yet.
          </div>
        )}
      </div>
    </div>
  )
}
