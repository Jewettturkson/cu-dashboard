import { supabase } from '@/lib/supabase'
import type { Client } from '@/lib/supabase'
import { Wifi, WifiOff } from 'lucide-react'

const formatGHS = (n: number) =>
  `GH₵ ${n.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`

export default async function ClientsPage() {
  const { data: clients, error } = await supabase
    .from('clients')
    .select('*, accounts(balance)')
    .order('full_name')

  if (error) return <p style={{ color: 'var(--danger)', padding: 20 }}>Error: {error.message}</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: 'var(--text)', fontWeight: 700, fontSize: 24 }}>Clients</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            {clients?.length ?? 0} registered savers
          </p>
        </div>
        <button
          style={{
            background: 'var(--accent)',
            color: '#f9fafb',
            border: 'none',
            borderRadius: 'var(--radius-btn)',
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          + Add client
        </button>
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
        {(clients ?? []).map((client: Client, i: number) => {
          const balance = (client as any).accounts?.[0]?.balance ?? 0
          return (
            <div
              key={client.id}
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
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--surface-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent)', fontWeight: 700, fontSize: 14, flexShrink: 0,
                }}
              >
                {client.full_name.charAt(0)}
              </div>

              {/* Name + account */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: 'var(--text)', fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {client.full_name}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: 11, fontFamily: 'monospace' }}>
                    {client.account_number ?? '—'}
                  </span>
                  {client.momo_number ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--warning)', fontSize: 11 }}>
                      <Wifi size={10} /> MoMo
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--text-dim)', fontSize: 11 }}>
                      <WifiOff size={10} />
                    </span>
                  )}
                </div>
              </div>

              {/* Balance */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
                  {formatGHS(balance)}
                </p>
                <span
                  style={{
                    display: 'inline-block',
                    background: client.is_active ? '#d1fae5' : 'var(--surface)',
                    color: client.is_active ? '#065f46' : 'var(--text-muted)',
                    fontSize: 10, fontWeight: 600,
                    padding: '1px 6px', borderRadius: 99, marginTop: 2,
                  }}
                >
                  {client.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          )
        })}

        {(clients ?? []).length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No clients yet.
          </div>
        )}
      </div>
    </div>
  )
}
