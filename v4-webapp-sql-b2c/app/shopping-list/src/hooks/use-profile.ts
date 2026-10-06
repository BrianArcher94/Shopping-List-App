import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { profileService, type PhotoState } from '@/data'
import type { ProfileDetails, ThemePreference, UserProfile } from '@/domain/profile'
import { refreshSignedInUser } from '@/auth/account-actions'
import { useTheme } from '@/hooks/use-theme'

export const profileKeys = {
  all: ['profile'] as const,
  me: () => [...profileKeys.all, 'me'] as const,
  activity: () => [...profileKeys.all, 'activity'] as const,
  photo: (version: string | null) => [...profileKeys.all, 'photo', version ?? 'none'] as const,
}

// ----- queries ---------------------------------------------------------------

export function useProfile() {
  return useQuery({ queryKey: profileKeys.me(), queryFn: () => profileService.getProfile() })
}

export function useProfileActivity() {
  return useQuery({ queryKey: profileKeys.activity(), queryFn: () => profileService.getActivity() })
}

/**
 * The photo needs the bearer token, so it cannot be a plain <img src="/api/...">.
 * Fetch it as a Blob (keyed by photoUpdatedAt, so a change refetches) and hand
 * back an object URL, revoked when it changes or the component unmounts.
 */
export function usePhotoUrl(profile: UserProfile | undefined): string | null {
  const version = profile?.hasPhoto ? profile.photoUpdatedAt : null
  const { data: blob } = useQuery({
    queryKey: profileKeys.photo(version),
    enabled: Boolean(version),
    staleTime: Infinity,
    queryFn: () => profileService.getPhoto(),
  })
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!version || !blob) {
      setUrl(null)
      return
    }
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob, version])
  return url
}

// ----- mutations -------------------------------------------------------------

function useMergeProfile() {
  const qc = useQueryClient()
  return (patch: Partial<UserProfile>) =>
    qc.setQueryData<UserProfile>(profileKeys.me(), (old) => (old ? { ...old, ...patch } : old))
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (details: ProfileDetails) => profileService.updateDetails(details),
    onSuccess: (profile) => {
      qc.setQueryData(profileKeys.me(), profile)
      // New name on the next audited write, not just in the UI.
      void refreshSignedInUser()
      toast.success('Profile saved and synced to Entra External ID')
    },
    // No toast on error: the form's status line shows the message in place.
  })
}

/** Applies the theme locally at once, then stores it on the profile. */
export function useSetThemePreference() {
  const { setTheme } = useTheme()
  const merge = useMergeProfile()
  const mutation = useMutation({
    mutationFn: (theme: ThemePreference) => profileService.setTheme(theme),
    onError: (e: Error) => toast.error(`Theme not saved to your profile: ${e.message}`),
  })
  return (theme: ThemePreference) => {
    setTheme(theme)
    merge({ theme })
    mutation.mutate(theme)
  }
}

export function useUploadPhoto() {
  const merge = useMergeProfile()
  return useMutation({
    mutationFn: (jpeg: Blob) => profileService.uploadPhoto(jpeg),
    onSuccess: (state: PhotoState) => {
      merge(state)
      toast.success('Photo updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useRemovePhoto() {
  const merge = useMergeProfile()
  return useMutation({
    mutationFn: () => profileService.removePhoto(),
    onSuccess: (state: PhotoState) => {
      merge(state)
      toast.success('Photo removed')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useRevokeSessions() {
  return useMutation({
    mutationFn: () => profileService.revokeSessions(),
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useExportData() {
  return useMutation({
    mutationFn: () => profileService.exportData(),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'shopping-list-my-data.json'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: (confirm: string) => profileService.deleteAccount(confirm),
    // Errors are shown inside the confirmation dialog.
  })
}
