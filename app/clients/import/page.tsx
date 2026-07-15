'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Upload, CheckCircle, AlertTriangle } from 'lucide-react'

const supabase = createClient()

type ParsedRow = {
  full_name: string
  phone: string
  momo_number: string | null
  account_number: string | null
  address: string | null
  problem?: string
}

/** Minimal CSV parser: handles quoted fields, escaped quotes, CRLF. */
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field); field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some(c => c.trim() !== '')) rows.push(row)
      row = []
    } else field += ch
  }
  row.push(field)
  if (row.some(c => c.trim() !== '')) rows.push(row)
  return rows
}

/** Map flexible header names to our fields. */
function headerIndex(headers: string[]) {
  const norm = headers.map(h => h.trim().toLowerCase().replace(/[\s-]+/g, '_'))
  const find = (...names: string[]) => norm.findIndex(h => names.includes(h))
  return {
    name: find('full_name', 'name', 'client_name', 'fullname'),
    phone: find('phone', 'phone_number', 'telephone', 'tel'),
    momo: find('momo_number', 'momo', 'mobile_money'),
    account: find('account_number', 'account', 'acc', 'account_no'),
    address: find('address', 'location', 'area'),
  }
}

export default function ImportClientsPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ ok: number; failed: { row: ParsedRow; reason: string }[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setResult(null)
    setFileName(file.name)
    const text = await file.text()
    const parsed = parseCSV(text)
    if (parsed.length < 2) { setError('The file needs a header row and at least one client row.'); return }

    const idx = headerIndex(parsed[0])
    if (idx.name === -1 || idx.phone === -1) {
      setError('Could not find the required columns. The header row must include "full_name" (or "name") and "phone".')
      return
    }

    const seenPhones = new Set<string>()
    const data: ParsedRow[] = parsed.slice(1).map(r => {
      const get = (i: number) => (i >= 0 ? (r[i] ?? '').trim() : '')
      const row: ParsedRow = {
        full_name: get(idx.name),
        phone: get(idx.phone),
        momo_number: get(idx.momo) || null,
        account_number: get(idx.account) || null,
        address: get(idx.address) || null,
      }
      if (!row.full_name) row.problem = 'Missing name'
      else if (!row.phone) row.problem = 'Missing phone'
      else if (seenPhones.has(row.phone)) row.problem = 'Duplicate phone in file'
      seenPhones.add(row.phone)
      return row
    })
    setRows(data)
  }

  const runImport = async () => {
    if (!rows) return
    const valid = rows.filter(r => !r.problem)
    setImporting(true)
    setProgress(0)

    let ok = 0
    const failed: { row: ParsedRow; reason: string }[] = []

    // Row-by-row in small chunks: one duplicate must not sink the batch,
    // and we want a per-row error report at the end.
    const CHUNK = 10
    for (let i = 0; i < valid.length; i += CHUNK) {
      const chunk = valid.slice(i, i + CHUNK)
      const results = await Promise.allSettled(
        chunk.map(r =>
          supabase.from('clients').insert({
            full_name: r.full_name,
            phone: r.phone,
            momo_number: r.momo_number,
            account_number: r.account_number,
            address: r.address,
          }).then(({ error }) => { if (error) throw new Error(error.message) })
        )
      )
      results.forEach((res, j) => {
        if (res.status === 'fulfilled') ok++
        else failed.push({
          row: chunk[j],
          reason: res.reason?.message?.includes('clients_phone_key') ? 'Phone already exists'
            : res.reason?.message?.includes('clients_account_number_key') ? 'Account number already exists'
            : (res.reason?.message ?? 'Unknown error'),
        })
      })
      setProgress(Math.min(i + CHUNK, valid.length))
    }

    setImporting(false)
    setResult({ ok, failed })
    router.refresh()
  }

  const inputBtn = {
    display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' as const,
    background: 'var(--surface)', border: '2px dashed var(--border)',
    borderRadius: 'var(--radius-card)', padding: '36px 20px',
    color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer', width: '100%',
    fontFamily: 'inherit',
  }

  const validCount = rows?.filter(r => !r.problem).length ?? 0
  const problemCount = (rows?.length ?? 0) - validCount

  return (
    <div>
      <Link href="/clients" style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
        ← Clients
      </Link>

      <h1 style={{ color: 'var(--text)', fontWeight: 700, fontSize: 24, marginTop: 12 }}>Import clients</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4, marginBottom: 20 }}>
        Upload a CSV of your existing client book. Required columns: <code>full_name</code>, <code>phone</code>.
        Optional: <code>momo_number</code>, <code>account_number</code>, <code>address</code>.
      </p>

      {result ? (
        <div>
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <CheckCircle size={56} style={{ color: 'var(--success)', margin: '0 auto 10px' }} />
            <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 19 }}>
              {result.ok} client{result.ok === 1 ? '' : 's'} imported
            </p>
            {result.failed.length > 0 && (
              <p style={{ color: 'var(--warning)', fontSize: 14, marginTop: 4 }}>
                {result.failed.length} row{result.failed.length === 1 ? '' : 's'} skipped
              </p>
            )}
          </div>

          {result.failed.length > 0 && (
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 'var(--radius-card)', padding: '12px 16px', marginBottom: 16 }}>
              {result.failed.map((f, i) => (
                <p key={i} style={{ color: 'var(--text-secondary)', fontSize: 13, padding: '3px 0' }}>
                  <strong>{f.row.full_name || '(no name)'}</strong> — {f.reason}
                </p>
              ))}
            </div>
          )}

          <Link
            href="/clients"
            style={{
              display: 'block', textAlign: 'center',
              background: 'var(--accent)', color: '#f9fafb',
              borderRadius: 'var(--radius-btn)', padding: '14px 20px',
              fontSize: 15, fontWeight: 500, textDecoration: 'none',
            }}
          >
            Back to clients
          </Link>
        </div>
      ) : !rows ? (
        <>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button onClick={() => fileRef.current?.click()} style={inputBtn}>
            <Upload size={18} />
            Choose a CSV file…
          </button>
          {error && (
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: 13, marginTop: 12 }}>
              {error}
            </div>
          )}
        </>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              <strong>{fileName}</strong> — {validCount} ready
              {problemCount > 0 && <span style={{ color: 'var(--warning)' }}> · {problemCount} with problems (skipped)</span>}
            </p>
            <button
              onClick={() => { setRows(null); setError(null) }}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Choose different file
            </button>
          </div>

          {/* Preview */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', overflow: 'auto', maxHeight: 360, marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Phone', 'MoMo', 'Account', 'Address', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)', opacity: r.problem ? 0.55 : 1 }}>
                    <td style={{ padding: '8px 10px', color: 'var(--text)' }}>{r.full_name || '—'}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{r.phone || '—'}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{r.momo_number ?? '—'}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-dim)', fontFamily: 'monospace', fontSize: 12 }}>{r.account_number ?? '—'}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{r.address ?? '—'}</td>
                    <td style={{ padding: '8px 10px' }}>
                      {r.problem && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--warning)', fontSize: 12 }}>
                          <AlertTriangle size={12} /> {r.problem}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={runImport}
            disabled={importing || validCount === 0}
            className="pressable"
            style={{
              width: '100%', padding: '15px 20px',
              background: importing || validCount === 0 ? 'var(--border)' : 'var(--accent)',
              color: '#f9fafb', border: 'none', borderRadius: 'var(--radius-btn)',
              fontSize: 15, fontWeight: 600,
              cursor: importing || validCount === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}
          >
            {importing
              ? `Importing… ${progress}/${validCount}`
              : `Import ${validCount} client${validCount === 1 ? '' : 's'}`}
          </button>
        </div>
      )}
    </div>
  )
}
