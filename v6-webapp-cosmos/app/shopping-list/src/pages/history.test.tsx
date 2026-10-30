import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

    // The newest past list (Ordered) is selected by default: one stamp on its stub,
    // one on the open receipt.
    expect(screen.getAllByText('Ordered', { selector: '.status-badge' })).toHaveLength(2)
  })

  test('picking a stub opens that week’s receipt with its items', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const older = await shoppingDataService.createList({ weekStartDate: '2026-05-17' })
    await shoppingDataService.addItem(older.id, { name: 'Bin bags', quantity: 1 })
    const newer = await shoppingDataService.createList({ weekStartDate: '2026-05-24' })
    await shoppingDataService.addItem(newer.id, { name: 'Bananas', quantity: 6 })

    renderWithProviders(<HistoryPage />)
    expect(await screen.findByText('Bananas')).toBeInTheDocument()

    const olderStub = screen.getByText('2026-05-17 → 2026-05-23').closest('button')!
    await user.click(olderStub)

    expect(olderStub).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByText('Bin bags')).toBeInTheDocument()
    expect(screen.queryByText('Bananas')).not.toBeInTheDocument()
  })
})
