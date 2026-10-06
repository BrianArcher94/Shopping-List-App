import { describe, expect, it } from 'vitest'
import { checkPhotoFile, cropSquare, initialsOf } from './photo'

describe('cropSquare', () => {
  it('zoom 1 takes the largest centred square', () => {
    expect(cropSquare(1200, 800, 1)).toEqual({ sx: 200, sy: 0, size: 800 })
    expect(cropSquare(600, 900, 1)).toEqual({ sx: 0, sy: 150, size: 600 })
  })

  it('zoom 2 halves the side and stays centred', () => {
    expect(cropSquare(1000, 1000, 2)).toEqual({ sx: 250, sy: 250, size: 500 })
  })

  it('clamps zoom to [1, 4]', () => {
    expect(cropSquare(1000, 1000, 0.5)).toEqual(cropSquare(1000, 1000, 1))
    expect(cropSquare(1000, 1000, 10)).toEqual(cropSquare(1000, 1000, 4))
  })
})

describe('checkPhotoFile', () => {
  const file = (name: string, type: string, size = 1000) => ({ name, type, size })

  it('accepts JPEG, PNG and WebP', () => {
    for (const [n, t] of [['a.jpg', 'image/jpeg'], ['a.png', 'image/png'], ['a.webp', 'image/webp']]) {
      expect(checkPhotoFile(file(n, t))).toBeNull()
    }
  })

  it('names the unsupported format', () => {
    expect(checkPhotoFile(file('IMG_1234.heic', 'image/heic'))).toBe(
      'HEIC files aren’t supported. Use a JPG, PNG or WebP image.',
    )
  })

  it('reports the size of an oversized file', () => {
    expect(checkPhotoFile(file('big.jpg', 'image/jpeg', 12 * 1024 * 1024))).toBe(
      'That image is 12.0 MB. Choose one under 10.0 MB.',
    )
  })
})

describe('initialsOf', () => {
  it.each([
    ['Sam Carter', 'SC'],
    ['sam', 'S'],
    ['  Mary  Jane   Watson ', 'MW'],
    ['', '?'],
  ])('%j -> %s', (name, expected) => {
    expect(initialsOf(name)).toBe(expected)
  })
})
