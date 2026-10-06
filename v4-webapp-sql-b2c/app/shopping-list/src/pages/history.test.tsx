import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import HistoryPage from './history'
import { shoppingDataService } from '@/data'

// Pin "now" to Monday 2026-06-01 so the current week starts 2026-05-31. History
// must show only weeks that have already passed — not the current or future weeks.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-06-01T10:00:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('HistoryPage', () => {
  test('shows empty state when there are no lists', async () => {
    renderWithProviders(<HistoryPage />)
    expect(await screen.findByText(/No lists yet/i)).toBeInTheDocument()
  })

  test('shows only past lists, newest-first, excluding the current and future weeks', async () => {
    await shoppingDataService.createList({ weekStartDate: '2026-05-17' })
    const middle = await shoppingDataService.createList({ weekStartDate: '2026-05-24' })
    await shoppingDataService.transitionStatus(middle.id, 'Ordered')
    await shoppingDataService.createList({ weekStartDate: '2026-05-31' }) // current week
    await shoppingDataService.createList({ weekStartDate: '2026-06-07' }) // future week

    renderWithProviders(<HistoryPage />)

    // The date range subtitle (YYYY-MM-DD → YYYY-MM-DD) preserves the ordering signal.
    const ranges = await screen.findAllByText(/2026-\d{2}-\d{2} → 2026-\d{2}-\d{2}/)
    expect(ranges.map((r) => r.textContent)).toEqual([
      '2026-05-24 → 2026-05-30',
      '2026-05-17 → 2026-05-23',
    ])

    // The current and future weeks must NOT appear.
    expect(screen.queryByText('2026-05-31 → 2026-06-06')).not.toBeInTheDocument()
    expect(screen.queryByText('2026-06-07 → 2026-06-13')).not.toBeInTheDocument()

    expect(screen.getByText('Ordered')).toBeInTheDocument()
  })
})
