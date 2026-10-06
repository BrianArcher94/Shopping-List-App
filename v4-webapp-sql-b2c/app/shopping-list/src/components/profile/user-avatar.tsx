import { initialsOf } from '@/lib/photo'

interface UserAvatarProps {
  name: string
  photoUrl: string | null
  /** Pixel diameter. */
  size: number
  ring?: boolean
  /** Alt text for the photo; omit when the name is already next to the avatar. */
  alt?: string
}

/** The user's photo, or their initials on the brand gradient. */
export function UserAvatar({ name, photoUrl, size, ring = false, alt = '' }: UserAvatarProps) {
  return (
    <span
      className={`avatar ${ring ? 'avatar--ring' : ''}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
    >
      {photoUrl ? <img src={photoUrl} alt={alt} /> : <span aria-hidden={alt === ''}>{initialsOf(name)}</span>}
    </span>
  )
}
