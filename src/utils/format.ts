export const fmtEuro = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const fmtEuroCompact = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export const fmtPct = new Intl.NumberFormat('de-DE', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

export const fmtPctPlain = new Intl.NumberFormat('de-DE', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export const fmtNum = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

export const fmtDate = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export const fmtDateShort = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: 'short',
})

export const fmtDateMonth = new Intl.DateTimeFormat('de-DE', {
  month: 'short',
  year: '2-digit',
})

export function formatEuro(v: number, hidden = false): string {
  if (hidden) return '••••'
  return fmtEuro.format(v)
}

export function formatPct(v: number): string {
  return fmtPct.format(v / 100)
}

export function formatDate(iso: string): string {
  return fmtDate.format(new Date(iso))
}

/** Number of days between two dates (positive = d2 is in the future) */
export function daysBetween(d1: Date, d2: Date): number {
  return Math.round((d2.getTime() - d1.getTime()) / 86_400_000)
}

/** Add months, clamping to month end if needed (e.g., Jan 31 + 1M = Feb 28/29) */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  const targetMonth = result.getMonth() + months
  result.setMonth(targetMonth)
  // If the day overflowed (e.g., March 30 when adding 1 month from Feb 29), clamp to month end
  if (result.getMonth() !== ((targetMonth % 12 + 12) % 12)) {
    result.setDate(0)
  }
  return result
}

export function subtractDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - days)
  return d
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function parseDate(iso: string): Date {
  // Parse as local date (YYYY-MM-DD) to avoid TZ issues
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function today(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
