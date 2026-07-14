'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { X, CheckCircle } from 'lucide-react'

const supabase = createClient()

/** Suggest the next ACC-XXXX number from existing ones (e.g. ACC-0005 → ACC-0006). */
function nextAccountNumber(existing: (string | null)[]): string {
  const max = existing.reduce((acc, n) => {
    const m = n?.match(/^ACC-(\d+)$/)
    return m ? Math.max(acc, parseInt(m[1], 10)) : acc
  }, 0)
  return `ACC-${String(max + 1).padStart(4, '0')}`
}

/** Map Postgres unique-violation errors to friendly field-level messages. */
function friendlyError(message: string): string {
  if (message.includes('clients_phone_key')) return 'A client with this phone number already exists.'
  if (message.includes('clients_account_number_key')) return 'This account number is already taken.'
  return message
}

export default function AddClientModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    momo_number: '',
    account_number: '',
    address: '',
  })

  // Prefill the next account number so the operator doesn't have to remember it
  useEffect(() => {
    supabase
      .from('clients')
      .select('account_number')
      .like('account_number', 'ACC-%')
      .then(({ data }) => {
        const suggestion = nextAccountNumber((data ?? []).map(r => r.account_number))
        setForm(f => (f.account_number ? f : { ...f, account_number: suggestion }))
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.from('clients').insert({
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      momo_number: form.momo_number.trim() || null,
      account_number: form.account_number.trim() || null,
      address: form.address.trim() || null,
    })

    setLoading(false)
    if (error) { setError(friendlyError(error.message)); return }

    setSuccess(true)
    setTimeout(() => { onClose(); router.refresh() }, 1500)
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

  const disabled = loading || !form.full_name.trim() || !form.phone.trim()

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(25,31,40,0.4)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',          /* bottom sheet on mobile */
        justifyContent: 'center',
      }}
    >
      {/* Sheet */}
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
        {/* Handle bar — mobile only */}
        <div className="md:hidden" style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 99 }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px 0',
        }}>
          <h2 style={{ color: 'var(--text)', fontWeight: 700, fontSize: 17 }}>Add client</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div style={{ padding: '48px 20px 32px', textAlign: 'center' }}>
            <CheckCircle size={48} style={{ color: 'var(--success)', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 17 }}>Client added</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
              {form.full_name.trim()} is ready to start saving.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Full name */}
            <div>
              <label style={labelStyle} htmlFor="ac-full-name">Full name *</label>
              <input
                id="ac-full-name"
                type="text" required autoFocus
                placeholder="e.g. Abena Boateng"
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                style={inputStyle}
              />
            </div>

            {/* Phone */}
            <div>
              <label style={labelStyle} htmlFor="ac-phone">Phone *</label>
              <input
                id="ac-phone"
                type="tel" required
                placeholder="e.g. 0244 000 000"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                style={{ ...inputStyle, fontVariantNumeric: 'tabular-nums' }}
              />
            </div>

            {/* MoMo number */}
            <div>
              <label style={labelStyle} htmlFor="ac-momo">
                MoMo number <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optional)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="ac-momo"
                  type="tel"
                  placeholder="Leave empty if client doesn't use MoMo"
                  value={form.momo_number}
                  onChange={e => setForm({ ...form, momo_number: e.target.value })}
                  style={{ ...inputStyle, fontVariantNumeric: 'tabular-nums', paddingRight: 110 }}
                />
                {/* Convenience: most clients' MoMo number is their phone number */}
                {form.phone.trim() && form.momo_number !== form.phone && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, momo_number: form.phone })}
                    style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      background: 'var(--surface-2)', color: 'var(--accent)',
                      border: 'none', borderRadius: 99,
                      padding: '4px 10px', fontSize: 12, fontWeight: 500,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Same as phone
                  </button>
                )}
              </div>
            </div>

            {/* Account number */}
            <div>
              <label style={labelStyle} htmlFor="ac-account">Account number</label>
              <input
                id="ac-account"
                type="text"
                placeholder="ACC-0001"
                value={form.account_number}
                onChange={e => setForm({ ...form, account_number: e.target.value })}
                style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 14 }}
              />
            </div>

            {/* Address */}
            <div>
              <label style={labelStyle} htmlFor="ac-address">
                Address <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                id="ac-address"
                type="text"
                placeholder="e.g. Adum, Kumasi"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
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
              {loading ? 'Adding…' : 'Add client'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
