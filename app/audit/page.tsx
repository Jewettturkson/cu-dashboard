import { createClient } from '@/lib/supabase-server'
import { ArrowDownCircle, ArrowUpCircle, UserPlus, UserCog, ShieldQuestion } from 'lucide-react'

// Live data — always fetch fresh, never serve a build-time snapshot
export const dynamic = 'force-dynamic'

type AuditEntry = {
  id: string
  actor_name: string | null
  actor_role: string | null
  action: string
  entity: string
  details: {
    amount?: number
    method?: string
    client_name?: string
    banker_name?: string
    account_number?: string
    employee_id?: string
    notes?: string
  } | null
  created_at: string
}

const formatGHS = (n: number) =>
  `GH₵ ${n.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`

const formatDateTime = (d: string) => {
  const dt = new Date(d)
  return dt.toLocaleDateString('en-GH', { day: 'numeric', month: 'short' }) +
    ' · ' + dt.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })
}

/** Human-readable line for each action type. */
function describe(e: AuditEntry): string {
  const d = e.details ?? {}
  switch (e.action) {
    case 'transaction.deposit':
      return `logged a ${d.method === 'momo' ? 'MoMo' : 'cash'} deposit of ${formatGHS(d.amount ?? 0)} for ${d.client_name ?? 'a client'}`
    case 'transaction.withdrawal':
      return `paid out a withdrawal of ${formatGHS(d.amount ?? 0)} for ${d.client_name ?? 'a client'}`
    case 'transaction.opening':
      return `recorded a migrated opening balance of ${formatGHS(d.amount ?? 0)} for ${d.client_name ?? 'a client'}`
    case 'withdrawal.requested':
      return `requested a ${d.method === 'momo' ? 'MoMo' : 'cash'} withdrawal of ${formatGHS(d.amount ?? 0)} for ${d.client_name ?? 'a client'}`
    case 'withdrawal.approved':
      return `approved the withdrawal of ${formatGHS(d.amount ?? 0)} for ${d.client_name ?? 'a client'}`
    case 'withdrawal.rejected':
      return `rejected the withdrawal of ${formatGHS(d.amount ?? 0)} for ${d.client_name ?? 'a client'}`
    case 'client.create':
      return `added client ${d.client_name ?? ''}${d.account_number ? ` (${d.account_number})` : ''}`
    case 'client.update':
      return `updated client ${d.client_name ?? ''}`
    case 'banker.create':
      return `added field officer ${d.banker_name ?? ''}${d.employee_id ? ` (${d.employee_id})` : ''}`
    case 'banker.update':
      return `updated field officer ${d.banker_name ?? ''}`
    default:
      return e.action
  }
}

function iconFor(action: string) {
  if (action === 'transaction.deposit')    return { Icon: ArrowDownCircle, color: 'var(--success)' }
  if (action === 'transaction.withdrawal') return { Icon: ArrowUpCircle,   color: 'var(--danger)' }
  if (action === 'withdrawal.rejected')    return { Icon: ArrowUpCircle,   color: 'var(--text-muted)' }
  if (action.startsWith('withdrawal.'))    return { Icon: ArrowUpCircle,   color: 'var(--warning)' }
  if (action.startsWith('client.'))        return { Icon: UserPlus,        color: 'var(--accent)' }
  if (action.startsWith('banker.'))        return { Icon: UserCog,         color: 'var(--warning)' }
  return { Icon: ShieldQuestion, color: 'var(--text-muted)' }
}

export default async function AuditPage() {
  const supabase = await createClient()

  const { data: entries, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return <p style={{ color: 'var(--danger)', padding: 20 }}>Error: {error.message}</p>

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: 'var(--text)', fontWeight: 700, fontSize: 24 }}>Audit log</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
          Every action, recorded permanently. Entries cannot be edited or deleted.
        </p>
      </div>

      <div
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
        }}
      >
        {(entries as AuditEntry[] ?? []).map((e, i) => {
          const { Icon, color } = iconFor(e.action)
          return (
            <div
              key={e.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '14px 20px',
                minHeight: 64,
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
              }}
            >
              <Icon size={20} style={{ color, flexShrink: 0, marginTop: 2 }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.45 }}>
                  <span style={{ fontWeight: 600 }}>{e.actor_name ?? 'Unknown'}</span>
                  {' '}{describe(e)}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      background: e.actor_role === 'admin' ? 'var(--surface-2)' : '#fef3c7',
                      color: e.actor_role === 'admin' ? 'var(--accent)' : '#92400e',
                      fontSize: 10, fontWeight: 600,
                      padding: '1px 8px', borderRadius: 99,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}
                  >
                    {e.actor_role ?? '—'}
                  </span>
                  <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                    {formatDateTime(e.created_at)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}

        {(entries ?? []).length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No activity recorded yet.
          </div>
        )}
      </div>
    </div>
  )
}
