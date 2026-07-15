// Offline deposit queue — IndexedDB-backed, idempotent by design.
// Each queued deposit carries a client-generated UUID as its primary
// key; if a sync retries after a flaky success, the database's
// unique constraint rejects the duplicate and we treat it as synced.

import type { SupabaseClient } from '@supabase/supabase-js'

export type QueuedDeposit = {
  id: string           // becomes transactions.id — the idempotency key
  client_id: string
  banker_id: string | null
  amount: number
  type: 'deposit'
  method: 'cash' | 'momo'
  queued_at: string
}

const DB_NAME = 'cu-offline'
const STORE = 'deposits'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(db => new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const req = fn(t.objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }))
}

export const queueDeposit = (d: QueuedDeposit) => tx('readwrite', s => s.add(d))
export const listQueued = () => tx<QueuedDeposit[]>('readonly', s => s.getAll() as IDBRequest<QueuedDeposit[]>)
export const removeQueued = (id: string) => tx('readwrite', s => s.delete(id))

/**
 * Push queued deposits to the server. Returns how many remain.
 * A duplicate-key error means an earlier attempt actually landed —
 * treated as success and removed from the queue.
 */
export async function flushQueue(supabase: SupabaseClient): Promise<number> {
  const pending = await listQueued()
  for (const d of pending) {
    const { error } = await supabase.from('transactions').insert({
      id: d.id,
      client_id: d.client_id,
      banker_id: d.banker_id,
      amount: d.amount,
      type: d.type,
      method: d.method,
      notes: `Synced from offline (recorded ${new Date(d.queued_at).toLocaleString('en-GH')})`,
    })
    if (!error || error.code === '23505') {
      await removeQueued(d.id)
    }
    // Any other error (still offline, RLS, etc.): leave it queued.
  }
  const left = await listQueued()
  window.dispatchEvent(new CustomEvent('cu-queue-changed', { detail: left.length }))
  return left.length
}
