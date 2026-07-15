'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Banknote } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

const nav = [
  { href: '/',             label: 'Dashboard' },
  { href: '/clients',      label: 'Clients' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/bankers',      label: 'Bankers' },
  { href: '/audit',        label: 'Audit' },
]

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()

  // Don't render on login page or the banker collect screen
  if (pathname === '/login' || pathname === '/collect') return null

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header
      style={{
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
      className="hidden md:block"
    >
      <div
        style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px' }}
        className="flex items-center justify-between h-14"
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            style={{ background: 'var(--accent)', borderRadius: 8 }}
            className="w-7 h-7 flex items-center justify-center"
          >
            <Banknote size={16} className="text-white" />
          </div>
          <span
            style={{ color: 'var(--text)', fontWeight: 700, fontSize: 15 }}
          >
            CU Dashboard
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {nav.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                style={{
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                  fontWeight: active ? 600 : 400,
                  fontSize: 14,
                  padding: '6px 12px',
                  borderRadius: 6,
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                  transition: 'color 120ms',
                }}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          style={{
            color: 'var(--text-muted)',
            fontSize: 13,
            fontWeight: 500,
            padding: '6px 12px',
            borderRadius: 'var(--radius-btn)',
            background: 'var(--surface)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
