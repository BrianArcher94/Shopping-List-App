import { describe, expect, it } from 'vitest'
import { ApiError } from './errors'
import {
  assertDeleteConfirmed,
  detailsFromGraph,
  emailFromGraph,
  isJpeg,
  mfaVerified,
  photoBlobName,
  validateDetails,
  validatePhoto,
  validateTheme,
} from './profile'
import { rowToActivityEntry, rowToProfile } from './profile-repository'

const valid = { displayName: 'Sam Carter', givenName: 'Sam', surname: 'Carter', city: 'Bristol', country: 'United Kingdom' }

function apiError(fn: () => unknown): ApiError {
  try {
    fn()
  } catch (e) {
    expect(e).toBeInstanceOf(ApiError)
    return e as ApiError
  }
  throw new Error('expected an ApiError')
}

describe('validateDetails', () => {
  it('accepts a full body and trims every field', () => {
    expect(validateDetails({ ...valid, displayName: '  Sam Carter  ' })).toEqual(valid)
  })

  it('treats missing optional fields as empty', () => {
    expect(validateDetails({ displayName: 'Sam' })).toEqual({
      displayName: 'Sam', givenName: '', surname: '', city: '', country: '',
    })
  })

  it('requires a display name (whitespace does not count)', () => {
    expect(apiError(() => validateDetails({ ...valid, displayName: '   ' })).status).toBe(400)
  })

  it('rejects unknown fields instead of passing them to Graph', () => {
    const err = apiError(() => validateDetails({ ...valid, mail: 'evil@example.com' }))
    expect(err.message).toMatch(/Unknown field\(s\): mail/)
  })

  it('rejects non-string values, over-long values and control characters', () => {
    expect(apiError(() => validateDetails({ ...valid, city: 42 })).message).toMatch(/city must be a string/)
    expect(apiError(() => validateDetails({ ...valid, givenName: 'x'.repeat(65) })).message).toMatch(/at most 64/)
    expect(apiError(() => validateDetails({ ...valid, surname: 'Car\nter' })).message).toMatch(/invalid characters/)
  })

  it('rejects non-objects', () => {
    for (const bad of [null, 'Sam', [valid]]) expect(apiError(() => validateDetails(bad)).status).toBe(400)
  })
})

describe('validateTheme / assertDeleteConfirmed', () => {
  it('accepts the three themes only', () => {
    expect(validateTheme({ theme: 'dark' })).toBe('dark')
    expect(apiError(() => validateTheme({ theme: 'blue' })).status).toBe(400)
    expect(apiError(() => validateTheme(null)).status).toBe(400)
  })

  it('demands the exact confirmation literal', () => {
    expect(() => assertDeleteConfirmed({ confirm: 'DELETE' })).not.toThrow()
    for (const bad of [{ confirm: 'delete' }, {}, null]) {
      expect(apiError(() => assertDeleteConfirmed(bad)).status).toBe(400)
    }
  })
})

describe('Graph mapping', () => {
  it('maps nulls to empty strings', () => {
    expect(detailsFromGraph({ id: 'x', displayName: 'Sam', givenName: null })).toEqual({
      displayName: 'Sam', givenName: '', surname: '', city: '', country: '',
    })
  })

  it('prefers the emailAddress sign-in identity over mail', () => {
    expect(emailFromGraph({
      id: 'x',
      mail: 'other@example.com',
      identities: [
        { signInType: 'userPrincipalName', issuerAssignedId: 'x@tenant.onmicrosoft.com' },
        { signInType: 'emailAddress', issuerAssignedId: 'sam@example.com' },
      ],
    })).toBe('sam@example.com')
    expect(emailFromGraph({ id: 'x', mail: 'm@example.com' })).toBe('m@example.com')
    expect(emailFromGraph({ id: 'x' })).toBe('')
  })

  it('mfaVerified reads the amr claim', () => {
    expect(mfaVerified(['pwd', 'mfa'])).toBe(true)
    expect(mfaVerified(['pwd'])).toBe(false)
    expect(mfaVerified(undefined)).toBe(false)
  })
})

describe('photos', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10])

  it('isJpeg checks the magic bytes', () => {
    expect(isJpeg(jpeg)).toBe(true)
    expect(isJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false) // PNG
  })

  it('validatePhoto: content type, emptiness, size and magic bytes', () => {
    expect(() => validatePhoto('image/jpeg', jpeg)).not.toThrow()
    expect(() => validatePhoto('image/jpeg; charset=binary', jpeg)).not.toThrow()
    expect(apiError(() => validatePhoto('image/png', jpeg)).status).toBe(415)
    expect(apiError(() => validatePhoto(null, jpeg)).status).toBe(415)
    expect(apiError(() => validatePhoto('image/jpeg', new Uint8Array())).status).toBe(400)
    expect(apiError(() => validatePhoto('image/jpeg', new Uint8Array(2 * 1024 * 1024 + 1).fill(0xff))).status).toBe(413)
    expect(apiError(() => validatePhoto('image/jpeg', new Uint8Array([1, 2, 3, 4]))).status).toBe(400)
  })

  it('photoBlobName refuses anything that is not GUID-shaped', () => {
    expect(photoBlobName('aaaaaaaa-0000-0000-0000-000000000004')).toBe('aaaaaaaa-0000-0000-0000-000000000004.jpg')
    expect(apiError(() => photoBlobName('../other')).status).toBe(400)
  })
})

describe('SQL row mappers', () => {
  it('rowToProfile maps the theme and photo timestamp', () => {
    expect(rowToProfile({ Theme: 'dark', PhotoUpdatedAt: null }))
      .toEqual({ theme: 'dark', photoUpdatedAt: null })
    expect(rowToProfile({ Theme: 'system', PhotoUpdatedAt: new Date('2026-10-01T09:00:00Z') }))
      .toEqual({ theme: 'system', photoUpdatedAt: '2026-10-01T09:00:00.000Z' })
  })

  it('rowToActivityEntry normalises nulls and dates', () => {
    expect(rowToActivityEntry({
      Kind: 'status', Label: 'Delivered', Quantity: null, ListId: '2026-09-20', ListName: 'Week of 20 Sep',
      At: new Date('2026-09-26T18:00:00Z'),
    })).toEqual({
      kind: 'status', label: 'Delivered', quantity: null, listId: '2026-09-20', listName: 'Week of 20 Sep',
      at: '2026-09-26T18:00:00.000Z',
    })
  })
})
