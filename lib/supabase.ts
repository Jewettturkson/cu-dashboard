import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Types ────────────────────────────────────────────────────
export type Client = {
  id: string
  full_name: string
  phone: string
  momo_number: string | null
  account_number: string | null
  address: string | null
  is_active: boolean
  created_at: string
  accounts?: { balance: number }[]
}

export type Banker = {
  id: string
  full_name: string
  phone: string
  employee_id: string | null
  is_active: boolean
  created_at: string
}

export type Transaction = {
  id: string
  client_id: string
  banker_id: string | null
  amount: number
  type: 'deposit' | 'withdrawal'
  method: 'cash' | 'momo'
  notes: string | null
  created_at: string
  clients?: { full_name: string; account_number: string | null }
  bankers?: { full_name: string } | null
}
