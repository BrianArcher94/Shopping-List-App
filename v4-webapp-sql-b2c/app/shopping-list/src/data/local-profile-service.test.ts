import { describe, expect, it } from 'vitest'
import { LocalProfileService } from './local-profile-service'

describe('LocalProfileService', () => {
  it('starts with a default local user', async () => {
    const p = await new LocalProfileService().getProfile()
    expect(p).toMatchObject({ displayName: 'Local user', theme: 'system', hasPhoto: false, mfaVerified: false })
  })

  it('persists trimmed details and rejects an empty display name', async () => {
    const svc = new LocalProfileService()
    await svc.updateDetails({ displayName: ' Sam Carter ', givenName: 'Sam', surname: 'Carter', city: '', country: '' })
    expect((await new LocalProfileService().getProfile()).displayName).toBe('Sam Carter')
    await expect(
      svc.updateDetails({ displayName: '  ', givenName: '', surname: '', city: '', country: '' }),
    ).rejects.toThrow(/displayName/)
  })

  it('round-trips the theme', async () => {
    const svc = new LocalProfileService()
    await svc.setTheme('dark')
    expect((await svc.getProfile()).theme).toBe('dark')
  })

  it('round-trips a photo and removes it', async () => {
    const svc = new LocalProfileService()
    const jpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: 'image/jpeg' })
    const state = await svc.uploadPhoto(jpeg)
    expect(state.hasPhoto).toBe(true)
    const back = await svc.getPhoto()
    expect(back!.type).toBe('image/jpeg')
    expect(new Uint8Array(await back!.arrayBuffer())).toEqual(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))
    await svc.removePhoto()
    expect(await svc.getPhoto()).toBeNull()
    expect((await svc.getProfile()).hasPhoto).toBe(false)
  })

  it('deleteAccount demands the confirmation literal, then resets to defaults', async () => {
    const svc = new LocalProfileService()
    await svc.updateDetails({ displayName: 'Sam', givenName: '', surname: '', city: '', country: '' })
    await expect(svc.deleteAccount('delete')).rejects.toThrow(/DELETE/)
    await svc.deleteAccount('DELETE')
    expect((await svc.getProfile()).displayName).toBe('Local user')
  })
})
