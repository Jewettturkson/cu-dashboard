'use client'

import { useState } from 'react'
import LogDepositModal from './LogDepositModal'

export default function LogDepositButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors font-medium"
      >
        + Log Deposit
      </button>
      {open && <LogDepositModal onClose={() => setOpen(false)} />}
    </>
  )
}
