import type { ListStatus, ShoppingList } from './types'

export function canTransition(from: ListStatus, to: ListStatus): boolean {
  if (from === 'Draft' && to === 'Ordered') return true
  if (from === 'Ordered' && to === 'Delivered') return true
  return false
}

export function isReadOnly(list: ShoppingList): boolean {
  return list.status !== 'Draft'
}

/**
 * Returns the ISO date (YYYY-MM-DD) of the Sunday that starts the upcoming
 * (or current) week. If today is Sunday, returns today.
 */
export function getUpcomingWeekStart(now: Date): string {
  const day = now.getDay() // 0=Sun..6=Sat
  const daysUntilSunday = day === 0 ? 0 : 7 - day
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday)
  return toIsoDate(sunday)
}

/**
 * Returns the ISO date (YYYY-MM-DD) of the Sunday that STARTS the week containing
 * `now` (the most recent Sunday on or before today). On a Sunday, returns today.
 * This is the "current week" — distinct from getUpcomingWeekStart (next Sunday),
 * which exists for the Saturday-20:00 auto-creation flow.
 */
export function getCurrentWeekStart(now: Date): string {
  const day = now.getDay() // 0=Sun..6=Sat
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day)
  return toIsoDate(sunday)
}

/** Given a Sunday ISO date, return the Saturday ISO date 6 days later. */
export function getWeekEnd(weekStartDate: string): string {
  const [y, m, d] = weekStartDate.split('-').map(Number)
  const end = new Date(y, m - 1, d + 6)
  return toIsoDate(end)
}

export function formatWeekLabel(weekStartDate: string): string {
  return `Week of ${weekStartDate}`
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
