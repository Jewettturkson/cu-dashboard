'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Wrong email or password. Please try again.')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-alt)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
      }}
    >
      {/* Logo mark */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div
          style={{
            width: 56,
            height: 56,
            background: 'var(--accent)',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}
        >
          {/* coin icon in flat vector style */}
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="10" stroke="white" strokeWidth="2.2" />
            <text x="14" y="19" textAnchor="middle" fill="white" fontSize="13" fontWeight="700" fontFamily="sans-serif">₵</text>
          </svg>
        </div>
        <h1 style={{ color: 'var(--text)', fontWeight: 700, fontSize: 20 }}>CU Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Credit Union Manager</p>
      </div>

      {/* Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 28,
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        <h2 style={{ color: 'var(--text)', fontWeight: 600, fontSize: 17, marginBottom: 24 }}>
          Sign in to your account
        </h2>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email */}
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Email address
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@creditunion.com"
              style={{
                width: '100%',
                background: 'var(--surface)',
                border: 'none',
                borderRadius: 'var(--radius-card)',
                padding: '14px 16px',
                fontSize: 15,
                color: 'var(--text)',
                outline: 'none',
                transition: 'box-shadow 120ms',
              }}
              onFocus={e => (e.target.style.boxShadow = '0 0 0 2px var(--accent)')}
              onBlur={e => (e.target.style.boxShadow = 'none')}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  background: 'var(--surface)',
                  border: 'none',
                  borderRadius: 'var(--radius-card)',
                  padding: '14px 44px 14px 16px',
                  fontSize: 15,
                  color: 'var(--text)',
                  outline: 'none',
                  transition: 'box-shadow 120ms',
                }}
                onFocus={e => (e.target.style.boxShadow = '0 0 0 2px var(--accent)')}
                onBlur={e => (e.target.style.boxShadow = 'none')}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 0,
                }}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: 8,
                padding: '10px 14px',
                color: 'var(--danger)',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="pressable"
            style={{
              background: loading ? 'var(--border)' : 'var(--accent)',
              color: '#f9fafb',
              border: 'none',
              borderRadius: 'var(--radius-btn)',
              padding: '14px 20px',
              fontSize: 15,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              width: '100%',
              marginTop: 4,
              transition: 'background 120ms',
            }}
            onMouseEnter={e => { if (!loading) (e.target as HTMLElement).style.background = 'var(--accent-hover)' }}
            onMouseLeave={e => { if (!loading) (e.target as HTMLElement).style.background = 'var(--accent)' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      <p style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 24 }}>
        Pilot v0.1 · Credit Union Manager
      </p>
    </div>
  )
}
