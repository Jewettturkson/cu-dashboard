'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LayoutDashboard, Users, ArrowLeftRight, UserCheck, Plus } from 'lucide-react'
import LogDepositModal from './LogDepositModal'

const nav = [
  { href: '/',             label: 'Home',        icon: LayoutDashboard },
  { href: '/clients',      label: 'Clients',     icon: Users },
  { href: '/transactions', label: 'Transactions',icon: ArrowLeftRight },
  { href: '/bankers',      label: 'Bankers',     icon: UserCheck },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [depositOpen, setDepositOpen] = useState(false)

  // Don't render on login page
  if (pathname === '/login') return null

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 56,
          background: 'var(--bg)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          zIndex: 50,
        }}
        className="md:hidden"
      >
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 pressable"
              style={{
                color: active ? 'var(--accent)' : 'var(--text-dim)',
                textDecoration: 'none',
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>
                {label}
              </span>
            </Link>
          )
        })}

        {/* Primary action — Log Deposit */}
        <button
          onClick={() => setDepositOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 pressable"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              background: 'var(--accent)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 2,
            }}
          >
            <Plus size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--accent)', marginTop: -4 }}>
            Deposit
          </span>
        </button>
      </nav>

      {depositOpen && <LogDepositModal onClose={() => setDepositOpen(false)} />}
    </>
  )
}
