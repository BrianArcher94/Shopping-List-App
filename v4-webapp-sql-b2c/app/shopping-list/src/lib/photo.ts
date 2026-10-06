import { PHOTO_MAX_SOURCE_BYTES, PHOTO_SIZE_PX } from '@/domain/profile'

// Client-side photo handling. Whatever the user picks is re-encoded here as a
// square JPEG of PHOTO_SIZE_PX: that normalises the format (Graph's photo API
// wants image/jpeg), strips EXIF metadata such as GPS location, and keeps the
// upload small. The API still validates the result.

export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp'
const ACCEPTED = PHOTO_ACCEPT.split(',')

const formatMb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

/** A user-facing reason the file can't be used, or null if it is fine. */
export function checkPhotoFile(file: Pick<File, 'type' | 'size' | 'name'>): string | null {
  if (!ACCEPTED.includes(file.type)) {
    const ext = file.name.split('.').pop()?.toUpperCase() ?? 'That'
    return `${ext} files aren’t supported. Use a JPG, PNG or WebP image.`
  }
  if (file.size > PHOTO_MAX_SOURCE_BYTES) {
    return `That image is ${formatMb(file.size)}. Choose one under ${formatMb(PHOTO_MAX_SOURCE_BYTES)}.`
  }
  return null
}

export interface CropRect {
  sx: number
  sy: number
  size: number
}

/**
 * Centre-square crop. zoom 1 = the largest square that fits; zoom 2 = half its
 * side. Matches the preview, which is the same image with object-fit: cover and
 * transform: scale(zoom) inside a circle.
 */
export function cropSquare(width: number, height: number, zoom: number): CropRect {
  const z = Math.min(Math.max(zoom, 1), 4)
  const size = Math.min(width, height) / z
  return { sx: (width - size) / 2, sy: (height - size) / 2, size }
}

/** Draw the crop onto a canvas and encode it as JPEG. Browser-only (canvas). */
export async function renderCroppedJpeg(img: HTMLImageElement, zoom: number, quality = 0.88): Promise<Blob> {
  const { sx, sy, size } = cropSquare(img.naturalWidth, img.naturalHeight, zoom)
  const canvas = document.createElement('canvas')
  canvas.width = PHOTO_SIZE_PX
  canvas.height = PHOTO_SIZE_PX
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser could not process the image')
  // JPEG has no transparency: paint white first so transparent PNGs don't go black.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, PHOTO_SIZE_PX, PHOTO_SIZE_PX)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, sx, sy, size, size, 0, 0, PHOTO_SIZE_PX, PHOTO_SIZE_PX)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the image'))), 'image/jpeg', quality),
  )
}

/** Two initials from a display name: "Sam Carter" -> "SC", "sam" -> "S". */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}
