import { describe, test, expect } from 'vitest'
import {
  canTransition,
  isReadOnly,
  getUpcomingWeekStart,
  getCurrentWeekStart,
  getWeekEnd,
  formatWeekLabel,
} from './rules'
import type { ShoppingList, ListStatus } from './types'

function makeList(status: ListStatus): ShoppingList {
  return {
    id: 'list-1',
    name: 'Week of 2026-05-31',
    weekStartDate: '2026-05-31',
    weekEndDate: '2026-06-06',
    status,
    createdAt: '2026-05-30T20:00:00.000Z',
    orderedAt: status === 'Draft' ? null : '2026-06-01T10:00:00.000Z',
    deliveredAt: status === 'Delivered' ? '2026-06-02T10:00:00.000Z' : null,
  }
}

describe('canTransition', () => {
  test('allows Draft → Ordered', () => {
    expect(canTransition('Draft', 'Ordered')).toBe(true)
  })

  test('allows Ordered → Delivered', () => {
    expect(canTransition('Ordered', 'Delivered')).toBe(true)
  })

  test('rejects Draft → Delivered (skip)', () => {
    expect(canTransition('Draft', 'Delivered')).toBe(false)
  })

  test('rejects Ordered → Draft (reverse)', () => {
    expect(canTransition('Ordered', 'Draft')).toBe(false)
  })

  test('rejects Delivered → anything', () => {
    expect(canTransition('Delivered', 'Draft')).toBe(false)
    expect(canTransition('Delivered', 'Ordered')).toBe(false)
  })

  test('rejects same-state transition', () => {
    expect(canTransition('Draft', 'Draft')).toBe(false)
  })
})

describe('isReadOnly', () => {
  test('Draft list is editable', () => {
    expect(isReadOnly(makeList('Draft'))).toBe(false)
  })

  test('Ordered list is read-only', () => {
    expect(isReadOnly(makeList('Ordered'))).toBe(true)
  })

  test('Delivered list is read-only', () => {
    expect(isReadOnly(makeList('Delivered'))).toBe(true)
  })
})

describe('getUpcomingWeekStart', () => {
  test('returns the next Sunday when called on Saturday 20:00 (rolls into next week)', () => {
    // Saturday 2026-05-30 20:00 local time → next Sunday is 2026-05-31
    const sat = new Date('2026-05-30T20:00:00')
    expect(getUpcomingWeekStart(sat)).toBe('2026-05-31')
  })

  test('returns the upcoming Sunday when called mid-week', () => {
    // Wednesday 2026-05-27 → upcoming Sunday is 2026-05-31
    const wed = new Date('2026-05-27T10:00:00')
    expect(getUpcomingWeekStart(wed)).toBe('2026-05-31')
  })

  test('returns the same day when called on a Sunday', () => {
    // Sunday 2026-05-31 → that very Sunday is the start of the current week
    const sun = new Date('2026-05-31T09:00:00')
    expect(getUpcomingWeekStart(sun)).toBe('2026-05-31')
  })
})

describe('getCurrentWeekStart', () => {
  test('returns the most recent Sunday when called mid-week (the bug case)', () => {
    // Monday 2026-06-01 → the week containing today started Sunday 2026-05-31
    const mon = new Date('2026-06-01T10:00:00')
    expect(getCurrentWeekStart(mon)).toBe('2026-05-31')
  })

  test('returns today when called on a Sunday', () => {
    const sun = new Date('2026-05-31T09:00:00')
    expect(getCurrentWeekStart(sun)).toBe('2026-05-31')
  })

  test('returns the same week start when called on the Saturday that ends the week', () => {
    // Saturday 2026-06-06 still belongs to the week that started Sunday 2026-05-31
    const sat = new Date('2026-06-06T23:00:00')
    expect(getCurrentWeekStart(sat)).toBe('2026-05-31')
  })
})

describe('getWeekEnd', () => {
  test('returns the Saturday 6 days after the Sunday week start', () => {
    expect(getWeekEnd('2026-05-31')).toBe('2026-06-06')
  })

  test('crosses month boundary correctly', () => {
    expect(getWeekEnd('2026-04-26')).toBe('2026-05-02')
  })
})

describe('formatWeekLabel', () => {
  test('produces "Week of YYYY-MM-DD"', () => {
    expect(formatWeekLabel('2026-05-31')).toBe('Week of 2026-05-31')
  })
})
