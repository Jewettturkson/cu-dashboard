'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

type Banker = { id: string; full_name: string }

const selectStyle = {
  background: 'var(--surface)',
  border: 'none',
  borderRadius: 'var(--radius-btn)',
  padding: '9px 10px',
  fontSize: 13,
  color: 'var(--text)',
  outline: 'none',
  fontFamily: 'inherit',
  appearance: 'auto' as const,
}

// URL-driven filters: shareable, survives refresh, server does the querying.
export default function TransactionFilters({ bankers }: { bankers: Banker[] }) {
  const router = useRouter()
  const params = useSearchParams()

  const setParam = useCallback((key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    router.replace(`/transactions?${next.toString()}`)
  }, [params, router])

  const hasFilters = ['type', 'method', 'banker', 'from', 'to'].some(k => params.get(k))

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'center' }}>
      <select value={params.get('type') ?? ''} onChange={e => setParam('type', e.target.value)} style={selectStyle}>
        <option value="">All types</option>
        <option value="deposit">Deposits</option>
        <option value="withdrawal">Withdrawals</option>
      </select>

      <select value={params.get('method') ?? ''} onChange={e => setParam('method', e.target.value)} style={selectStyle}>
        <option value="">Cash + MoMo</option>
        <option value="cash">Cash</option>
        <option value="momo">MoMo</option>
      </select>

      <select value={params.get('banker') ?? ''} onChange={e => setParam('banker', e.target.value)} style={selectStyle}>
        <option value="">All bankers</option>
        {bankers.map(b => <option key={b.id} value={b.id}>{b.full_name}</option>)}
      </select>

      <input
        type="date"
        value={params.get('from') ?? ''}
        onChange={e => setParam('from', e.target.value)}
        aria-label="From date"
        style={selectStyle}
      />
      <input
        type="date"
        value={params.get('to') ?? ''}
        onChange={e => setParam('to', e.target.value)}
        aria-label="To date"
        style={selectStyle}
      />

      {hasFilters && (
        <button
          onClick={() => router.replace('/transactions')}
          style={{
            background: 'none', border: 'none', color: 'var(--accent)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', padding: '9px 4px',
          }}
        >
          Clear
        </button>
      )}
    </div>
  )
}
