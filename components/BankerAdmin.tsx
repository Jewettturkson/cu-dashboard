'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AddBankerModal from './AddBankerModal'

export function AddBankerButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="pressable"
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
        + Add banker
      </button>
      {open && <AddBankerModal onClose={() => setOpen(false)} />}
    </>
  )
}

// Per-row activate/deactivate. Deactivation also locks the login
// (server-side), so a dismissed banker is out the moment you tap.
export function BankerStatusToggle({ bankerId, isActive }: { bankerId: string; isActive: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = async () => {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/bankers/${bankerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !isActive }),
    })
    const json = await res.json()
    setBusy(false)
    if (!res.ok) { setError(json.error ?? 'Failed'); return }
    router.refresh()
  }

  return (
    <div style={{ textAlign: 'right' }}>
      <button
        onClick={toggle}
        disabled={busy}
        className="pressable"
        style={{
          background: 'var(--surface)',
          color: isActive ? 'var(--danger)' : 'var(--accent)',
          border: 'none',
          borderRadius: 'var(--radius-btn)',
          padding: '7px 12px',
          fontSize: 12,
          fontWeight: 600,
          cursor: busy ? 'wait' : 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {busy ? '…' : isActive ? 'Deactivate' : 'Reactivate'}
      </button>
      {error && (
        <p style={{ color: 'var(--danger)', fontSize: 11, marginTop: 4, maxWidth: 160 }}>{error}</p>
      )}
    </div>
  )
}
