import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, UserRound } from 'lucide-react'
import { useMsal } from '@azure/msal-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserAvatar } from '@/components/profile/user-avatar'
import { usePhotoUrl, useProfile } from '@/hooks/use-profile'
import { useTheme } from '@/hooks/use-theme'

/**
 * Avatar + account menu (Profile, Sign out). Rendered in the header only when
 * auth is enabled. Names come from the profile (Entra, via the API) once it has
 * loaded - the MSAL account's ID-token name can be stale after a rename.
 */
export function UserMenu() {
  const { instance } = useMsal()
  const account = instance.getActiveAccount() ?? instance.getAllAccounts()[0]
  const profile = useProfile().data
  const photoUrl = usePhotoUrl(profile)
  useApplySavedTheme(profile?.theme)

  const name = profile?.displayName || account?.name || account?.username || 'Signed in'
  const email = profile?.email || account?.username

  function signOut() {
    void instance.logoutRedirect({ account, postLogoutRedirectUri: `${window.location.origin}/` })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="avatar-btn size-11" aria-label={`Account menu for ${name}`}>
          <UserAvatar name={name} photoUrl={photoUrl} size={40} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal flex items-center gap-2.5">
          <UserAvatar name={name} photoUrl={photoUrl} size={36} />
          <span className="min-w-0">
            <p className="text-sm font-semibold m-0 truncate">{name}</p>
            {email && email !== name && <p className="muted-text text-xs m-0 truncate">{email}</p>}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <UserRound className="size-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * The theme is saved on the profile so it follows the user between devices.
 * Apply it once per sign-in; after that the local toggle and the profile page
 * keep both in step (useSetThemePreference).
 */
function useApplySavedTheme(saved: ReturnType<typeof useTheme>['theme'] | undefined) {
  const { theme, setTheme } = useTheme()
  const applied = useRef(false)
  useEffect(() => {
    if (!saved || applied.current) return
    applied.current = true
    if (saved !== theme) setTheme(saved)
  }, [saved, theme, setTheme])
}
