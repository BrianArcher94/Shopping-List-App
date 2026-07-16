import { describe, test, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import FavouritesPage from './favourites'
import { shoppingDataService } from '@/data'

describe('FavouritesPage', () => {
  test('shows existing favourites', async () => {
    await shoppingDataService.addFavourite({ name: 'Eggs', defaultQuantity: 12 })

    renderWithProviders(<FavouritesPage />)

    expect(await screen.findByText('Eggs')).toBeInTheDocument()
    expect(screen.getByText('Your favourites (1)')).toBeInTheDocument()
  })

  test('user can add a favourite and it appears in the list', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FavouritesPage />)

    const nameInput = await screen.findByLabelText(/favourite name/i)
    await user.type(nameInput, 'Coffee')
    await user.click(screen.getByRole('button', { name: /add/i }))

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
})
