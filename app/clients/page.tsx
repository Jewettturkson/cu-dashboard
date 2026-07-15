import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import type { Client } from '@/lib/supabase'
import { Upload } from 'lucide-react'
import AddClientButton from '@/components/AddClientButton'
import ClientList from '@/components/ClientList'

// Live data — always fetch fresh, never serve a build-time snapshot
export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients, error } = await supabase
    .from('clients')
    .select('*, accounts(balance)')
    .order('full_name')

  if (error) return <p style={{ color: 'var(--danger)', padding: 20 }}>Error: {error.message}</p>

  const rows = (clients ?? []).map((c: Client) => ({
    id: c.id,
    full_name: c.full_name,
    account_number: c.account_number,
    momo_number: c.momo_number,
    is_active: c.is_active,
    balance: Number(c.accounts?.[0]?.balance ?? 0),
  }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: 'var(--text)', fontWeight: 700, fontSize: 24 }}>Clients</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            {rows.length} registered savers
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link
            href="/clients/import"
            aria-label="Import clients from CSV"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--surface)', color: 'var(--text-secondary)',
              borderRadius: 'var(--radius-btn)', padding: '10px 14px',
              fontSize: 14, fontWeight: 500, textDecoration: 'none',
            }}
          >
            <Upload size={14} /> Import
          </Link>
          <AddClientButton />
        </div>
      </div>

      <ClientList clients={rows} />
    </div>
  )
}
