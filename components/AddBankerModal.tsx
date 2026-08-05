'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, CheckCircle } from 'lucide-react'

// Admin creates a field officer + their login in one step.
// The email can be a synthetic employee-ID address (bnk-003@cu.app);
// the temp password is shown once so the admin can hand it over.
export default function AddBankerModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<{ email: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    employee_id: '',
    email: '',
    password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/bankers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    setLoading(false)

    if (!res.ok) { setError(json.error ?? 'Something went wrong'); return }
    setDone({ email: json.email })
  }

  const finish = () => {
    onClose()
    router.refresh()
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--surface)',
    border: 'none',
    borderRadius: 'var(--radius-card)',
    padding: '14px 16px',
    fontSize: 15,
    color: 'var(--text)',
    outline: 'none',
    fontFamily: 'inherit',
  }

  const labelStyle = {
    display: 'block' as const,
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 6,
  }

  const disabled =
    loading || !form.full_name.trim() || !form.phone.trim() ||
    !form.email.trim() || form.password.length < 8

  return (
    <div
      onClick={done ? undefined : onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(25,31,40,0.4)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--bg)',
          borderRadius: '16px 16px 0 0',
          boxShadow: 'var(--shadow-modal)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          maxHeight: '90dvh',
          overflowY: 'auto',
        }}
        className="md:rounded-[12px] md:mb-8"
      >
        <div className="md:hidden" style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 99 }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0' }}>
          <h2 style={{ color: 'var(--text)', fontWeight: 700, fontSize: 17 }}>Add banker</h2>
          <button
            onClick={done ? finish : onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {done ? (
          <div style={{ padding: '32px 20px 28px', textAlign: 'center' }}>
            <CheckCircle size={48} style={{ color: 'var(--success)', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 17 }}>Banker created</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>
              Login: <strong style={{ color: 'var(--text)' }}>{done.email}</strong>
            </p>
            <div style={{
              background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8,
              padding: '10px 14px', color: 'var(--warning)', fontSize: 13, marginTop: 14, textAlign: 'left',
            }}>
              Hand over the password you just set — it is not shown again.
              The banker should change it after first sign-in.
            </div>
            <button
              onClick={finish}
              className="pressable"
              style={{
                marginTop: 20, width: '100%', padding: '14px 20px',
                background: 'var(--accent)', color: '#f9fafb',
                border: 'none', borderRadius: 'var(--radius-btn)',
                fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle} htmlFor="ab-name">Full name *</label>
              <input
                id="ab-name" type="text" required autoFocus
                placeholder="e.g. Kofi Mensah"
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle} htmlFor="ab-phone">Phone *</label>
              <input
                id="ab-phone" type="tel" required
                placeholder="e.g. 0244 000 000"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                style={{ ...inputStyle, fontVariantNumeric: 'tabular-nums' }}
              />
            </div>

            <div>
              <label style={labelStyle} htmlFor="ab-emp">Employee ID</label>
              <input
                id="ab-emp" type="text"
                placeholder="e.g. BNK-003"
                value={form.employee_id}
                onChange={e => setForm({ ...form, employee_id: e.target.value })}
                style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 14 }}
              />
            </div>

            <div>
              <label style={labelStyle} htmlFor="ab-email">Login email *</label>
              <input
                id="ab-email" type="email" required
                placeholder="e.g. bnk-003@yourcu.app"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle} htmlFor="ab-pwd">Temporary password * <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(min 8 characters)</span></label>
              <input
                id="ab-pwd" type="text" required minLength={8}
                placeholder="They should change it after first sign-in"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={disabled}
              className="pressable"
              style={{
                background: disabled ? 'var(--border)' : 'var(--accent)',
                color: '#f9fafb',
                border: 'none',
                borderRadius: 'var(--radius-btn)',
                padding: '14px 20px',
                fontSize: 15,
                fontWeight: 500,
                cursor: disabled ? 'not-allowed' : 'pointer',
                width: '100%',
                fontFamily: 'inherit',
                marginTop: 4,
              }}
            >
              {loading ? 'Creating…' : 'Create banker + login'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
