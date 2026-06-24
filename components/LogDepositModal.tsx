'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { X, Banknote, Wifi, CheckCircle } from 'lucide-react'

const supabase = createClient()

type Client = { id: string; full_name: string; account_number: string | null }
type Banker = { id: string; full_name: string }

export default function LogDepositModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [bankers, setBankers] = useState<Banker[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const [form, setForm] = useState({
    client_id: '',
    banker_id: '',
    amount: '',
    method: 'cash' as 'cash' | 'momo',
    notes: '',
  })

  useEffect(() => {
    Promise.all([
      supabase.from('clients').select('id, full_name, account_number').eq('is_active', true).order('full_name'),
      supabase.from('bankers').select('id, full_name').eq('is_active', true).order('full_name'),
    ]).then(([{ data: c }, { data: b }]) => {
      setClients(c ?? [])
      setBankers(b ?? [])
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.from('transactions').insert({
      client_id: form.client_id,
      banker_id: form.banker_id || null,
      amount:    parseFloat(form.amount),
      type:      'deposit',
      method:    form.method,
      notes:     form.notes || null,
    })

    setLoading(false)
    if (error) { setError(error.message); return }

    setSuccess(true)
    setTimeout(() => { onClose(); router.refresh() }, 1800)
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
          /* on wide screens, show as centered modal */
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
          <h2 style={{ color: 'var(--text)', fontWeight: 700, fontSize: 17 }}>Log deposit</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div style={{ padding: '48px 20px 32px', textAlign: 'center' }}>
            <CheckCircle size={48} style={{ color: 'var(--success)', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 17 }}>Deposit recorded</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Account balance updated.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Client */}
            <div>
              <label style={labelStyle}>Client *</label>
              <select
                required
                value={form.client_id}
                onChange={e => setForm({ ...form, client_id: e.target.value })}
                style={{ ...inputStyle, appearance: 'auto' }}
              >
                <option value="">Select client…</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}{c.account_number ? ` — ${c.account_number}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label style={labelStyle}>Amount (GH₵) *</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)', fontSize: 15, fontWeight: 500,
                }}>
                  GH₵
                </span>
                <input
                  type="number" required min="0.01" step="0.01" placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  style={{ ...inputStyle, paddingLeft: 52, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}
                />
              </div>
            </div>

            {/* Method toggle */}
            <div>
              <label style={labelStyle}>Payment method</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['cash', 'momo'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm({ ...form, method: m })}
                    className="pressable"
                    style={{
                      flex: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-btn)',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 500, fontSize: 14,
                      fontFamily: 'inherit',
                      background: form.method === m
                        ? (m === 'momo' ? '#fef3c7' : 'var(--accent)')
                        : 'var(--surface)',
                      color: form.method === m
                        ? (m === 'momo' ? '#92400e' : '#f9fafb')
                        : 'var(--text-muted)',
                      transition: 'all 120ms',
                    }}
                  >
                    {m === 'momo' ? <Wifi size={15} /> : <Banknote size={15} />}
                    {m === 'momo' ? 'MoMo' : 'Cash'}
                  </button>
                ))}
              </div>
            </div>

            {/* Banker */}
            <div>
              <label style={labelStyle}>Collected by</label>
              <select
                value={form.banker_id}
                onChange={e => setForm({ ...form, banker_id: e.target.value })}
                style={{ ...inputStyle, appearance: 'auto' }}
              >
                <option value="">Self / MoMo — no field banker</option>
                {bankers.map(b => <option key={b.id} value={b.id}>{b.full_name}</option>)}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Notes <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. Weekly savings, market day"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
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
              disabled={loading || !form.client_id || !form.amount}
              className="pressable"
              style={{
                background: (loading || !form.client_id || !form.amount) ? 'var(--border)' : 'var(--accent)',
                color: '#f9fafb',
                border: 'none',
                borderRadius: 'var(--radius-btn)',
                padding: '14px 20px',
                fontSize: 15,
                fontWeight: 500,
                cursor: (loading || !form.client_id || !form.amount) ? 'not-allowed' : 'pointer',
                width: '100%',
                fontFamily: 'inherit',
                marginTop: 4,
              }}
            >
              {loading ? 'Recording…' : 'Record deposit'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
