'use client'

import { useState } from 'react'
import AddClientModal from './AddClientModal'

export default function AddClientButton() {
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
        + Add client
      </button>
      {open && <AddClientModal onClose={() => setOpen(false)} />}
    </>
  )
}
