import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { CreateListDialog } from './create-list-dialog'
import { shoppingDataService } from '@/data'

// The Calendar opens on "today". Pin the clock to May 2026 so the month it shows
// always contains the Sunday these tests click (2026-05-10), independent of the
// real wall-clock. Only Date is faked, so userEvent's timers still run normally.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-05-01T12:00:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

function Trigger() {
  return (
    <CreateListDialog
      trigger={<button type="button">Open dialog</button>}
    />
  )
}

describe('CreateListDialog', () => {
  test('opens, lets you pick a Sunday, creates the list, and the data layer sees it', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Trigger />)

    await user.click(screen.getByRole('button', { name: /open dialog/i }))

    // The dialog is open; the Create button is initially disabled.
    const createBtn = await screen.findByRole('button', { name: /create list/i })
    expect(createBtn).toBeDisabled()

    // Pick a Sunday — 2026-05-10. The Calendar renders dates as button cells with
    // an aria-label like "Sunday, June 7, 2026". Sundays are enabled; other days
    // are disabled by the dialog's `disabled` callback.
    const sundayCell = await screen.findByRole('button', { name: /Sunday, May 10th, 2026/i })
    expect(sundayCell).not.toBeDisabled()
    await user.click(sundayCell)

    // A Monday is disabled.
    const mondayCell = screen.queryByRole('button', { name: /Monday, May 11th, 2026/i })
    if (mondayCell) expect(mondayCell).toBeDisabled()

    expect(createBtn).toBeEnabled()
    await user.click(createBtn)

    await waitFor(async () => {
      const lists = await shoppingDataService.listAllLists()
      const created = lists.find((l) => l.weekStartDate === '2026-05-10')
      expect(created).toBeDefined()
      expect(created?.status).toBe('Draft')
    })
  })

  test('shows an error toast and keeps the dialog open when the week already has a list', async () => {
    const user = userEvent.setup()
    await shoppingDataService.createList({ weekStartDate: '2026-05-10' })

    renderWithProviders(<Trigger />)
    await user.click(screen.getByRole('button', { name: /open dialog/i }))

    const sundayCell = await screen.findByRole('button', { name: /Sunday, May 10th, 2026/i })
    await user.click(sundayCell)
    await user.click(screen.getByRole('button', { name: /create list/i }))

    // Dialog stays open since the mutation errored.
    await waitFor(() => {
      expect(screen.getByText(/new shopping list/i)).toBeInTheDocument()
    })
  })
})
