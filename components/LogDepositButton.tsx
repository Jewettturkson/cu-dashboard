'use client'

import { useState } from 'react'
import LogDepositModal from './LogDepositModal'

export default function LogDepositButton() {
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
        + Log deposit
      </button>
      {open && <LogDepositModal onClose={() => setOpen(false)} />}
    </>
  )
}
