import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/providers/theme-provider'
import { LandingPage } from './landing-page'
import { buildLoginRequest } from './msal'

function renderLanding(props: Partial<Parameters<typeof LandingPage>[0]> = {}) {
  const onSignIn = vi.fn()
  const onSignUp = vi.fn()
  render(
    <ThemeProvider>
      <LandingPage onSignIn={onSignIn} onSignUp={onSignUp} {...props} />
    </ThemeProvider>,
  )
  return { onSignIn, onSignUp }
}

describe('LandingPage', () => {
  it('shows the brand, the description and both entry points', () => {
    renderLanding()
    expect(screen.getByText('Shopping List', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/weekly shop/i)
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create an account/i })).toBeInTheDocument()
  })

  it('never asks for a password - External ID owns credentials', () => {
    const { container } = render(
      <ThemeProvider>
        <LandingPage onSignIn={vi.fn()} onSignUp={vi.fn()} />
      </ThemeProvider>,
    )
    expect(container.querySelector('input[type="password"]')).toBeNull()
  })

  it('signs in with the typed email as a hint', async () => {
    const { onSignIn, onSignUp } = renderLanding()
    await userEvent.type(screen.getByLabelText(/email/i), 'sam@example.com')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(onSignIn).toHaveBeenCalledWith('sam@example.com')
    expect(onSignUp).not.toHaveBeenCalled()
  })

  it('signs in without an email too', async () => {
    const { onSignIn } = renderLanding()
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(onSignIn).toHaveBeenCalledWith('')
  })

  it('sends new users to sign-up', async () => {
    const { onSignUp } = renderLanding()
    await userEvent.type(screen.getByLabelText(/email/i), 'new@example.com')
    await userEvent.click(screen.getByRole('button', { name: /create an account/i }))
    expect(onSignUp).toHaveBeenCalledWith('new@example.com')
  })

  it('shows a redirect error', () => {
    renderLanding({ error: 'Sign-in was cancelled.' })
    expect(screen.getByRole('alert')).toHaveTextContent('Sign-in was cancelled.')
  })
})

describe('buildLoginRequest', () => {
  const scope = 'api://x/access_as_user'

  it('plain sign-in requests only the API scope', () => {
    expect(buildLoginRequest(scope)).toEqual({ scopes: [scope] })
  })

  it('sign-up adds prompt=create', () => {
    expect(buildLoginRequest(scope, { signUp: true })).toEqual({ scopes: [scope], prompt: 'create' })
  })

  it('passes a trimmed email as loginHint and drops a blank one', () => {
    expect(buildLoginRequest(scope, { loginHint: '  sam@example.com ' }).loginHint).toBe('sam@example.com')
    expect(buildLoginRequest(scope, { loginHint: '   ' })).not.toHaveProperty('loginHint')
  })
})
