'use client'

import { useRouter } from 'next/navigation'
import { Printer } from 'lucide-react'

export default function ReconToolbar({ date }: { date: string }) {
  const router = useRouter()

  return (
    <div className="no-print" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        type="date"
        value={date}
        onChange={e => e.target.value && router.replace(`/reconciliation?date=${e.target.value}`)}
        aria-label="Report date"
        style={{
          background: 'var(--surface)', border: 'none', borderRadius: 'var(--radius-btn)',
          padding: '9px 10px', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
        }}
      />
      <button
        onClick={() => window.print()}
        className="pressable"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--accent)', color: '#f9fafb',
          border: 'none', borderRadius: 'var(--radius-btn)',
          padding: '9px 14px', fontSize: 13, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <Printer size={14} /> Print
      </button>
    </div>
  )
}
