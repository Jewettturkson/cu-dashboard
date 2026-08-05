import Link from 'next/link'

// Server-rendered pagination links. Preserves any existing URL
// params (filters) while swapping the page number — no client JS.
export default function Pager({
  basePath,
  page,
  hasMore,
  params,
}: {
  basePath: string
  page: number
  hasMore: boolean
  params: Record<string, string | undefined>
}) {
  if (page <= 1 && !hasMore) return null

  const href = (p: number) => {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v)
    if (p > 1) qs.set('page', String(p))
    const q = qs.toString()
    return q ? `${basePath}?${q}` : basePath
  }

  const linkStyle = (enabled: boolean) => ({
    display: 'inline-block',
    background: enabled ? 'var(--surface)' : 'transparent',
    color: enabled ? 'var(--accent)' : 'var(--text-dim)',
    borderRadius: 'var(--radius-btn)',
    padding: '9px 16px',
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
    pointerEvents: enabled ? ('auto' as const) : ('none' as const),
  })

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
      <Link href={href(page - 1)} aria-disabled={page <= 1} style={linkStyle(page > 1)}>
        ← Previous
      </Link>
      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Page {page}</span>
      <Link href={href(page + 1)} aria-disabled={!hasMore} style={linkStyle(hasMore)}>
        Next →
      </Link>
    </div>
  )
}
