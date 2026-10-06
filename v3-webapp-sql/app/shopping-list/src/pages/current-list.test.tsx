import { describe, test, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import CurrentListPage from './current-list'
import { shoppingDataService } from '@/data'
import { getCurrentWeekStart } from '@/domain/rules'

beforeEach(async () => {
  // seed a Draft list for "this" week so getCurrentList(now) finds it
  const weekStart = getCurrentWeekStart(new Date())
  await shoppingDataService.createList({ weekStartDate: weekStart })
})

describe('CurrentListPage — Draft list', () => {
  test('shows the list header with Draft badge', async () => {
    renderWithProviders(<CurrentListPage />)

    expect(await screen.findByText(/Week of/i)).toBeInTheDocument()
    // Scope to the badge: the progress stepper also renders a "Draft" step label.
    expect(screen.getByText('Draft', { selector: '.status-badge' })).toBeInTheDocument()
  })

  test('user can add an item, and it appears in the list', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CurrentListPage />)

    await screen.findByText(/Week of/i)
    const input = screen.getByLabelText(/item name/i)
    await user.type(input, 'Apples')
    await user.click(screen.getByRole('button', { name: /add item/i }))

    expect(await screen.findByText('Apples')).toBeInTheDocument()
  })

  test('Mark ordered button is disabled when the list is empty', async () => {
    renderWithProviders(<CurrentListPage />)
    await screen.findByText(/Week of/i)
    expect(screen.getByRole('button', { name: /mark ordered/i })).toBeDisabled()
  })

  test('user can remove an item', async () => {
    const user = userEvent.setup()
    const lists = await shoppingDataService.listAllLists()
    await shoppingDataService.addItem(lists[0].id, { name: 'Milk', quantity: 1 })

    renderWithProviders(<CurrentListPage />)
    expect(await screen.findByText('Milk')).toBeInTheDocument()

    await user.click(screen.getByLabelText(/remove milk/i))
    await waitFor(() => expect(screen.queryByText('Milk')).not.toBeInTheDocument())
  })
})

describe('CurrentListPage — notes (expandable row)', () => {
  test('user can expand a row, type a note, and the note persists', async () => {
    const user = userEvent.setup()
    const lists = await shoppingDataService.listAllLists()
    await shoppingDataService.addItem(lists[0].id, { name: 'Bananas', quantity: 6 })

    renderWithProviders(<CurrentListPage />)
    await screen.findByText('Bananas')

    await user.click(screen.getByRole('button', { name: /show notes for bananas/i }))
    const textarea = await screen.findByRole('textbox', { name: /notes for bananas/i })
    await user.type(textarea, 'Get the ripe ones')
    textarea.blur()

    await waitFor(async () => {
      const items = await shoppingDataService.listItems(lists[0].id)
      expect(items[0].notes).toBe('Get the ripe ones')
    })
  })

  test('read-only list: row shows existing notes as static text, no textarea', async () => {
    const lists = await shoppingDataService.listAllLists()
    const item = await shoppingDataService.addItem(lists[0].id, { name: 'Milk', quantity: 1 })
    await shoppingDataService.updateItemNotes(item.id, 'Whole milk only')
    await shoppingDataService.transitionStatus(lists[0].id, 'Ordered')

    renderWithProviders(<CurrentListPage />)

    expect(await screen.findByText('Whole milk only')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /notes for milk/i })).not.toBeInTheDocument()
  })
})

describe('CurrentListPage — favourite from list (star icon)', () => {
  test('clicking the empty star adds the item to favourites', async () => {
    const user = userEvent.setup()
    const lists = await shoppingDataService.listAllLists()
    await shoppingDataService.addItem(lists[0].id, { name: 'Bananas', quantity: 6 })

    renderWithProviders(<CurrentListPage />)
    await screen.findByText('Bananas')

    const star = await screen.findByRole('button', { name: /add bananas to favourites/i })
    await user.click(star)

    await waitFor(async () => {
      const favs = await shoppingDataService.listFavourites()
      const bananas = favs.find((f) => f.name === 'Bananas')
      expect(bananas?.defaultQuantity).toBe(6)
    })
  })

  test('clicking the filled star removes the item from favourites', async () => {
    const user = userEvent.setup()
    const lists = await shoppingDataService.listAllLists()
    await shoppingDataService.addItem(lists[0].id, { name: 'Milk', quantity: 2 })
    await shoppingDataService.addFavourite({ name: 'Milk', defaultQuantity: 2 })

    renderWithProviders(<CurrentListPage />)
    await screen.findByText('Milk')

    const star = await screen.findByRole('button', { name: /remove milk from favourites/i })
    expect(star).toHaveAttribute('aria-pressed', 'true')
    await user.click(star)

    await waitFor(async () => {
      const favs = await shoppingDataService.listFavourites()
      expect(favs.find((f) => f.name === 'Milk')).toBeUndefined()
    })
  })
})

describe('CurrentListPage — Ordered (read-only)', () => {
  test('does NOT render the add-item form and disables the remove button', async () => {
    const lists = await shoppingDataService.listAllLists()
    await shoppingDataService.addItem(lists[0].id, { name: 'Milk', quantity: 1 })
    await shoppingDataService.transitionStatus(lists[0].id, 'Ordered')

    renderWithProviders(<CurrentListPage />)

    // Scope to the badge: the progress stepper also renders an "Ordered" step label.
    expect(await screen.findByText('Ordered', { selector: '.status-badge' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/item name/i)).not.toBeInTheDocument()
    expect(screen.getByText(/read-only/i)).toBeInTheDocument()
    expect(await screen.findByLabelText(/remove milk/i)).toBeDisabled()
  })
})
