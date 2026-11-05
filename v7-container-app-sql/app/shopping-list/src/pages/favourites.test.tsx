import { describe, test, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import FavouritesPage from './favourites'
import { shoppingDataService } from '@/data'
import { getCurrentWeekStart } from '@/domain/rules'

describe('FavouritesPage', () => {
  test('shows existing favourites', async () => {
    await shoppingDataService.addFavourite({ name: 'Eggs', defaultQuantity: 12 })

    renderWithProviders(<FavouritesPage />)

    expect(await screen.findByText('Eggs')).toBeInTheDocument()
    expect(screen.getByText(/1 saved/)).toBeInTheDocument()
  })

  test('user can add a favourite and it appears in the list', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FavouritesPage />)

    const nameInput = await screen.findByLabelText(/favourite name/i)
    await user.type(nameInput, 'Coffee')
    await user.click(screen.getByRole('button', { name: /save favourite/i }))

    expect(await screen.findByText('Coffee')).toBeInTheDocument()
  })

  test('user can remove a favourite', async () => {
    const user = userEvent.setup()
    await shoppingDataService.addFavourite({ name: 'Eggs', defaultQuantity: 12 })

    renderWithProviders(<FavouritesPage />)
    expect(await screen.findByText('Eggs')).toBeInTheDocument()

    await user.click(screen.getByLabelText(/remove eggs/i))
    await waitFor(() => expect(screen.queryByText('Eggs')).not.toBeInTheDocument())
  })

  test('a favourite can be clipped onto this week’s Draft list', async () => {
    const user = userEvent.setup()
    const list = await shoppingDataService.createList({ weekStartDate: getCurrentWeekStart(new Date()) })
    await shoppingDataService.addFavourite({ name: 'Eggs', defaultQuantity: 12 })

    renderWithProviders(<FavouritesPage />)
    await user.click(await screen.findByRole('button', { name: /clip eggs to this week/i }))

    expect(await screen.findByText(/on this week’s receipt/i)).toBeInTheDocument()
    const items = await shoppingDataService.listItems(list.id)
    expect(items.map((i) => [i.name, i.quantity])).toEqual([['Eggs', 12]])
  })

  test('no clip buttons when there is no Draft list this week', async () => {
    await shoppingDataService.addFavourite({ name: 'Eggs', defaultQuantity: 12 })
    renderWithProviders(<FavouritesPage />)
    expect(await screen.findByText('Eggs')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /clip eggs/i })).not.toBeInTheDocument()
  })
})
