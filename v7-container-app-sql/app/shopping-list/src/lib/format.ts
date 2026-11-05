import { format } from 'date-fns'

/** Parse a YYYY-MM-DD (or longer ISO) string as a LOCAL date, ignoring any time part. */
export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** "Sun 4 – Sat 10 Oct", or "Sun 27 Sep – Sat 3 Oct" when the week spans two months. */
export function weekRangeLabel(weekStartDate: string, weekEndDate: string): string {
  const start = parseIsoDate(weekStartDate)
  const end = parseIsoDate(weekEndDate)
  const sameMonth = start.getMonth() === end.getMonth()
  return `${format(start, sameMonth ? 'EEE d' : 'EEE d MMM')} – ${format(end, 'EEE d MMM')}`
}

/** Receipt-style timestamp, e.g. "THU 08.10 09:14". Returns "—" for a missing value. */
export function stampTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return format(d, 'EEE dd.MM HH:mm').toUpperCase()
}

/** When the next weekly list is auto-created: the Saturday that ends this week, 20:00. */
export function nextListOpensLabel(weekEndDate: string): string {
  return `${format(parseIsoDate(weekEndDate), 'EEE dd.MM').toUpperCase()} 20:00`
}

export function monthLabel(weekStartDate: string): string {
  return format(parseIsoDate(weekStartDate), 'MMMM yyyy').toUpperCase()
}
