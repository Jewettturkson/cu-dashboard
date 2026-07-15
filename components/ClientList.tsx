'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Wifi, WifiOff, ChevronRight, Search } from 'lucide-react'

export type ClientRow = {
  id: string
  full_name: string
  account_number: string | null
  momo_number: string | null
  is_active: boolean
  balance: number
}

const formatGHS = (n: number) =>
  `GH₵ ${n.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`

// Instant in-memory search — fine well past pilot scale (thousands of rows).
export default function ClientList({ clients }: { clients: ClientRow[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      c =>
        c.full_name.toLowerCase().includes(q) ||
        (c.account_number ?? '').toLowerCase().includes(q)
    )
  }, [clients, query])

  return (
    <>
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
        <input
          type="text"
          placeholder="Search name or account number…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%', background: 'var(--surface)', border: 'none',
            borderRadius: 'var(--radius-card)', padding: '13px 16px 13px 40px',
            fontSize: 15, color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
          }}
        />
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
        {filtered.map((client, i) => (
          <Link
            key={client.id}
            href={`/clients/${client.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 20px',
              height: 64,
              borderTop: i === 0 ? 'none' : '1px solid var(--border)',
              gap: 12,
              textDecoration: 'none',
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
                {formatGHS(client.balance)}
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

            <ChevronRight size={16} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
          </Link>
        ))}

        {filtered.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            {query ? 'No client matches your search.' : 'No clients yet.'}
          </div>
        )}
      </div>
    </>
  )
}
