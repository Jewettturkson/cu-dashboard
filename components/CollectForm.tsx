'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Banknote, Wifi, CheckCircle, Clock, CloudOff, LogOut, Search } from 'lucide-react'
import { queueDeposit, listQueued, flushQueue } from '@/lib/offline-queue'

const supabase = createClient()

type ClientRow = { id: string; full_name: string; account_number: string | null }

type Props = {
  clients: ClientRow[]
  bankerId: string | null
  bankerName: string
  isAdmin: boolean
}

// One screen, one action: pick client → amount → confirm.
// Designed for low digital literacy: big targets, color + icon
// feedback, no navigation.
export default function CollectForm({ clients, bankerId, bankerName, isAdmin }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<ClientRow | null>(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'cash' | 'momo'>('cash')
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit')
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<{ client: string; amount: string; mode: 'deposit' | 'withdraw'; offline?: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingSync, setPendingSync] = useState(0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      c =>
        c.full_name.toLowerCase().includes(q) ||
        (c.account_number ?? '').toLowerCase().includes(q)
    )
  }, [clients, query])

  // Track the offline queue: count on mount, refresh when the
  // global sync (PWASetup) drains it or we add to it.
  useEffect(() => {
    listQueued().then(q => setPendingSync(q.length)).catch(() => {})
    const onChange = (e: Event) => setPendingSync((e as CustomEvent<number>).detail)
    window.addEventListener('cu-queue-changed', onChange)
    return () => window.removeEventListener('cu-queue-changed', onChange)
  }, [])

  // Fetch this one client's balance when entering withdrawal mode —
  // bankers can't browse balances, but a client asking to withdraw
  // already knows theirs from their susu book.
  useEffect(() => {
    if (mode !== 'withdraw' || !selected) { setBalance(null); return }
    let cancelled = false
    supabase.rpc('get_client_balance', { p_client_id: selected.id }).then(({ data }) => {
      if (!cancelled) setBalance(data !== null ? Number(data) : null)
    })
    return () => { cancelled = true }
  }, [mode, selected])

  const overBalance =
    mode === 'withdraw' && balance !== null && parseFloat(amount || '0') > balance

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleSubmit = async () => {
    if (!selected || !amount) return
    setLoading(true)
    setError(null)

    // Withdrawals need the server (balance check + approval queue)
    if (mode === 'withdraw' && !navigator.onLine) {
      setLoading(false)
      setError('Withdrawal requests need a connection. Deposits still work offline.')
      return
    }

    // Deposits post straight to the ledger; withdrawals only create
    // a request — money moves when an admin approves it.
    const depositId = crypto.randomUUID() // idempotency key for offline sync
    const { error } = mode === 'deposit'
      ? await supabase.from('transactions').insert({
          id: depositId,
          client_id: selected.id,
          banker_id: bankerId,
          amount: parseFloat(amount),
          type: 'deposit',
          method,
        })
      : await supabase.from('withdrawal_requests').insert({
          client_id: selected.id,
          banker_id: bankerId,
          amount: parseFloat(amount),
          method,
        })

    setLoading(false)

    // Network failure on a deposit → queue it locally, sync later.
    const isNetworkError = error && (!navigator.onLine || /fetch|network/i.test(error.message))
    if (mode === 'deposit' && isNetworkError) {
      try {
        await queueDeposit({
          id: depositId,
          client_id: selected.id,
          banker_id: bankerId,
          amount: parseFloat(amount),
          type: 'deposit',
          method,
          queued_at: new Date().toISOString(),
        })
        const q = await listQueued()
        setPendingSync(q.length)
        setSuccess({ client: selected.full_name, amount, mode, offline: true })
      } catch {
        setError('Could not save offline on this device. Please retry when connected.')
      }
      return
    }

    if (error) { setError(error.message); return }

    setSuccess({ client: selected.full_name, amount, mode })
    flushQueue(supabase).catch(() => {}) // good moment to drain any backlog
  }

  const reset = () => {
    setSuccess(null)
    setSelected(null)
    setAmount('')
    setMethod('cash')
    setMode('deposit')
    setQuery('')
  }

  /* ── Success screen: unmissable confirmation ── */
  if (success) {
    const isDeposit = success.mode === 'deposit'
    return (
      <div style={{ padding: '64px 20px', textAlign: 'center' }}>
        {success.offline ? (
          <CloudOff size={72} style={{ color: 'var(--warning)', margin: '0 auto 16px' }} />
        ) : isDeposit ? (
          <CheckCircle size={72} style={{ color: 'var(--success)', margin: '0 auto 16px' }} />
        ) : (
          <Clock size={72} style={{ color: 'var(--warning)', margin: '0 auto 16px' }} />
        )}
        <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 22 }}>
          {success.offline ? 'Saved on this phone' : isDeposit ? 'Deposit recorded' : 'Withdrawal requested'}
        </p>
        <p style={{ color: 'var(--text)', fontSize: 17, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
          GH₵ {Number(success.amount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>{success.client}</p>
        {success.offline && (
          <p style={{ color: 'var(--warning)', fontSize: 14, marginTop: 12, fontWeight: 500 }}>
            No network — will send automatically when you have signal.
            Do NOT re-enter this deposit.
          </p>
        )}
        {!isDeposit && !success.offline && (
          <p style={{ color: 'var(--warning)', fontSize: 14, marginTop: 12, fontWeight: 500 }}>
            Waiting for admin approval — do not pay out yet.
          </p>
        )}
        <button
          onClick={reset}
          className="pressable"
          style={{
            marginTop: 32, width: '100%', padding: '16px 20px',
            background: 'var(--accent)', color: '#f9fafb',
            border: 'none', borderRadius: 'var(--radius-btn)',
            fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Log another
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ color: 'var(--text)', fontWeight: 700, fontSize: 20 }}>Collect</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{bankerName}</p>
          {pendingSync > 0 && (
            <p style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              color: '#92400e', background: '#fef3c7',
              fontSize: 12, fontWeight: 600, padding: '2px 8px',
              borderRadius: 99, marginTop: 6,
            }}>
              <CloudOff size={11} /> {pendingSync} waiting to sync
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isAdmin && (
            <Link href="/" style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
              Dashboard
            </Link>
          )}
          <button
            onClick={handleSignOut}
            aria-label="Sign out"
            style={{ background: 'var(--surface)', border: 'none', borderRadius: 'var(--radius-btn)', padding: 10, cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Step 1: pick client */}
      {!selected ? (
        <>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search name or account…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                width: '100%', background: 'var(--surface)', border: 'none',
                borderRadius: 'var(--radius-card)', padding: '14px 16px 14px 40px',
                fontSize: 15, color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
            {filtered.map((c, i) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="pressable"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                  minHeight: 64, padding: '0 16px', textAlign: 'left',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{
                  width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent)', fontWeight: 700, fontSize: 14, flexShrink: 0,
                }}>
                  {c.full_name.charAt(0)}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', color: 'var(--text)', fontWeight: 500, fontSize: 15 }}>{c.full_name}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: 12, fontFamily: 'monospace' }}>{c.account_number ?? '—'}</span>
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                No client found.
              </p>
            )}
          </div>
        </>
      ) : (
        /* Step 2: amount + confirm */
        <div>
          <button
            onClick={() => setSelected(null)}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 14, fontWeight: 500, cursor: 'pointer', padding: 0, marginBottom: 16, fontFamily: 'inherit' }}
          >
            ← Change client
          </button>

          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-card)', padding: '16px 20px', marginBottom: 20 }}>
            <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 17 }}>{selected.full_name}</p>
            <p style={{ color: 'var(--text-dim)', fontSize: 12, fontFamily: 'monospace', marginTop: 2 }}>{selected.account_number ?? '—'}</p>
          </div>

          {/* Deposit / Withdrawal mode */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {(['deposit', 'withdraw'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="pressable"
                style={{
                  flex: 1, padding: '12px 16px',
                  borderRadius: 'var(--radius-btn)', border: 'none',
                  cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: 'inherit',
                  background: mode === m
                    ? (m === 'withdraw' ? 'var(--danger)' : 'var(--success)')
                    : 'var(--surface)',
                  color: mode === m ? '#f9fafb' : 'var(--text-muted)',
                  transition: 'all 120ms',
                }}
              >
                {m === 'deposit' ? 'Deposit' : 'Withdrawal'}
              </button>
            ))}
          </div>

          {mode === 'withdraw' && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--surface)', borderRadius: 'var(--radius-card)', padding: '12px 16px',
              }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>
                  Available balance
                </span>
                <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>
                  {balance === null
                    ? '…'
                    : `GH₵ ${balance.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`}
                </span>
              </div>
              <p style={{ color: 'var(--warning)', fontSize: 13, fontWeight: 500, marginTop: 8 }}>
                Withdrawals need admin approval before paying out.
              </p>
            </div>
          )}

          <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            Amount (GH₵)
          </label>
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 20, fontWeight: 500 }}>
              GH₵
            </span>
            <input
              type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0.00" autoFocus
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{
                width: '100%', background: 'var(--surface)', border: 'none',
                borderRadius: 'var(--radius-card)', padding: '20px 16px 20px 64px',
                fontSize: 26, fontWeight: 700, color: 'var(--text)', outline: 'none',
                fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', textAlign: 'right',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {(['cash', 'momo'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className="pressable"
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '14px 16px', borderRadius: 'var(--radius-btn)', border: 'none',
                  cursor: 'pointer', fontWeight: 600, fontSize: 15, fontFamily: 'inherit',
                  background: method === m ? (m === 'momo' ? '#fef3c7' : 'var(--accent)') : 'var(--surface)',
                  color: method === m ? (m === 'momo' ? '#92400e' : '#f9fafb') : 'var(--text-muted)',
                  transition: 'all 120ms',
                }}
              >
                {m === 'momo' ? <Wifi size={16} /> : <Banknote size={16} />}
                {m === 'momo' ? 'MoMo' : 'Cash'}
              </button>
            ))}
          </div>

          {overBalance && (
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
              Amount exceeds available balance.
            </div>
          )}

          {error && (
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !amount || overBalance}
            className="pressable"
            style={{
              width: '100%', padding: '18px 20px',
              background: loading || !amount || overBalance ? 'var(--border)' : 'var(--accent)',
              color: '#f9fafb', border: 'none', borderRadius: 'var(--radius-btn)',
              fontSize: 17, fontWeight: 600,
              cursor: loading || !amount || overBalance ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}
          >
            {loading
              ? 'Recording…'
              : mode === 'deposit'
                ? `Record GH₵ ${amount || '0.00'}`
                : `Request withdrawal of GH₵ ${amount || '0.00'}`}
          </button>
        </div>
      )}
    </div>
  )
}
