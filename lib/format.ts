// Shared formatting + timezone helpers.
// One definition of currency formatting for the whole app, and
// all "today" logic pinned to Africa/Accra — the credit unions'
// timezone — never the server's. (Ghana is UTC+0 year-round, so
// Accra midnight == UTC midnight, which keeps date math simple.)

export const formatGHS = (n: number) =>
  `GH₵ ${Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`

/** YYYY-MM-DD for "today" in Africa/Accra, regardless of server TZ. */
export function accraDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Accra',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/** ISO instant for midnight (start of day) in Accra on the given YYYY-MM-DD. */
export const accraDayStart = (day: string) => `${day}T00:00:00Z`

/** ISO instant for the start of the Accra month containing the given day. */
export const accraMonthStart = (day: string) => `${day.slice(0, 7)}-01T00:00:00Z`
