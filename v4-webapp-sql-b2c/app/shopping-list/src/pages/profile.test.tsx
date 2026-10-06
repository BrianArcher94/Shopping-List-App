import { describe, expect, test } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { ThemeProvider } from '@/providers/theme-provider'
import { profileService } from '@/data'
import ProfilePage from './profile'

// Runs against LocalProfileService (MODE === 'test'), like the other page tests.

function renderProfile() {
  return renderWithProviders(
    <ThemeProvider defaultTheme="light">
      <ProfilePage />
    </ThemeProvider>,
    { initialPath: '/profile', routePath: '/profile' },
  )
}

async function seed() {
  await profileService.updateDetails({
    displayName: 'Sam Carter', givenName: 'Sam', surname: 'Carter', city: 'Bristol', country: 'United Kingdom',
  })
}

describe('ProfilePage', () => {
  test('shows the profile with every card', async () => {
    await seed()
    renderProfile()

    expect(await screen.findByRole('heading', { name: 'Sam Carter' })).toBeInTheDocument()
    expect(screen.getByLabelText('Display name')).toHaveValue('Sam Carter')
    expect(screen.getByLabelText(/Town or city/)).toHaveValue('Bristol')
    for (const title of ['How you appear', 'App settings', 'Sign-in & security', 'Export or delete', 'Your contributions']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    }
  })

  test('sign-in email is read-only', async () => {
    renderProfile()
    expect(await screen.findByLabelText('Sign-in email')).toHaveAttribute('readonly')
  })

  test('editing enables Save; saving persists and returns to "up to date"', async () => {
    const user = userEvent.setup()
    await seed()
    renderProfile()

    const save = await screen.findByRole('button', { name: 'Save changes' })
    expect(save).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Up to date with Entra External ID')

    const city = screen.getByLabelText(/Town or city/)
    await user.clear(city)
    await user.type(city, 'Bath')
    expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes')
    expect(save).toBeEnabled()

    await user.click(save)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Up to date'))
    expect((await profileService.getProfile()).city).toBe('Bath')
  })

  test('an empty display name blocks saving and explains why', async () => {
    const user = userEvent.setup()
    await seed()
    renderProfile()

    const name = await screen.findByLabelText('Display name')
    await user.clear(name)
    expect(screen.getByText('Display name can’t be empty.')).toBeInTheDocument()
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  test('Discard restores the saved values', async () => {
    const user = userEvent.setup()
    await seed()
    renderProfile()

    const surname = await screen.findByLabelText(/Last name/)
    await user.type(surname, 'xyz')
    await user.click(screen.getByRole('button', { name: 'Discard' }))
    expect(surname).toHaveValue('Carter')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  test('theme buttons are a pressed-state group and save to the profile', async () => {
    const user = userEvent.setup()
    renderProfile()

    const group = await screen.findByRole('group', { name: 'Theme' })
    const dark = within(group).getByRole('button', { name: 'Dark' })
    expect(within(group).getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(dark)
    expect(dark).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement).toHaveClass('dark')
    await waitFor(async () => expect((await profileService.getProfile()).theme).toBe('dark'))
  })

  test('delete stays disabled until DELETE is typed exactly', async () => {
    const user = userEvent.setup()
    await seed()
    renderProfile()

    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog')
    const confirm = within(dialog).getByRole('button', { name: 'Delete account' })
    expect(confirm).toBeDisabled()

    const input = within(dialog).getByLabelText('Type DELETE to confirm')
    await user.type(input, 'delete')
    expect(confirm).toBeDisabled()
    await user.clear(input)
    await user.type(input, 'DELETE')
    expect(confirm).toBeEnabled()

    await user.click(confirm)
    await waitFor(async () => expect((await profileService.getProfile()).displayName).toBe('Local user'))
  })

  test('photo dialog rejects an unsupported file with a clear message', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderProfile()

    await user.click(await screen.findByRole('button', { name: 'Change profile photo' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: 'Save photo' })).toBeDisabled()

    const heic = new File([new Uint8Array([1, 2, 3])], 'IMG_0001.heic', { type: 'image/heic' })
    await user.upload(within(dialog).getByLabelText('Choose an image'), heic)
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('HEIC files aren’t supported')
    expect(within(dialog).getByRole('button', { name: 'Save photo' })).toBeDisabled()
  })

  test('shows Remove photo only when there is a photo', async () => {
    renderProfile()
    await screen.findByRole('button', { name: 'Change photo' })
    expect(screen.queryByRole('button', { name: 'Remove photo' })).not.toBeInTheDocument()
  })
})
