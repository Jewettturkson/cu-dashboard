'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { ArrowUpCircle } from 'lucide-react'

const supabase = createClient()

export type WithdrawalRequest = {
  id: string
  amount: number
  method: 'cash' | 'momo'
  created_at: string
  clients: { full_name: string; account_number: string | null } | null
  bankers: { full_name: string } | null
}

const formatGHS = (n: number) =>
  `GH₵ ${Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`

// Admin-only panel: approve moves money (atomically, balance-checked
// in the database); reject closes the request. Both are audited.
export default function PendingWithdrawals({ requests }: { requests: WithdrawalRequest[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (requests.length === 0) return null

  const act = async (id: string, fn: 'approve_withdrawal' | 'reject_withdrawal') => {
    setBusyId(id)
    setError(null)
    const { error } = await supabase.rpc(fn, { request_id: id })
    setBusyId(null)
    if (error) { setError(error.message); return }
    router.refresh()
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <h2 style={{ color: 'var(--text)', fontWeight: 600, fontSize: 17 }}>Pending withdrawals</h2>
        <span
          style={{
            background: '#fff7ed', color: 'var(--warning)',
            fontSize: 12, fontWeight: 700,
            padding: '1px 8px', borderRadius: 99,
          }}
        >
          {requests.length}
        </span>
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
        {requests.map((r, i) => (
          <div
            key={r.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', minHeight: 64,
              borderTop: i === 0 ? 'none' : '1px solid var(--border)',
            }}
          >
            <ArrowUpCircle size={20} style={{ color: 'var(--danger)', flexShrink: 0 }} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: 'var(--text)', fontWeight: 500, fontSize: 14 }}>
                {r.clients?.full_name ?? 'Unknown client'}
                <span style={{ color: 'var(--text)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {' '}· {formatGHS(r.amount)}
                </span>
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 1 }}>
                {r.method === 'momo' ? 'MoMo' : 'Cash'}
                {r.bankers?.full_name ? ` · requested by ${r.bankers.full_name}` : ' · requested by admin'}
              </p>
            </div>

            <button
              onClick={() => act(r.id, 'reject_withdrawal')}
              disabled={busyId === r.id}
              className="pressable"
              style={{
                background: 'var(--surface)', color: 'var(--danger)',
                border: 'none', borderRadius: 'var(--radius-btn)',
                padding: '8px 14px', fontSize: 13, fontWeight: 600,
                cursor: busyId === r.id ? 'wait' : 'pointer', fontFamily: 'inherit',
              }}
            >
              Reject
            </button>
            <button
              onClick={() => act(r.id, 'approve_withdrawal')}
              disabled={busyId === r.id}
              className="pressable"
              style={{
                background: 'var(--accent)', color: '#f9fafb',
                border: 'none', borderRadius: 'var(--radius-btn)',
                padding: '8px 14px', fontSize: 13, fontWeight: 600,
                cursor: busyId === r.id ? 'wait' : 'pointer', fontFamily: 'inherit',
              }}
            >
              {busyId === r.id ? 'Working…' : 'Approve'}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>
          {error}
        </div>
      )}
    </div>
  )
}
