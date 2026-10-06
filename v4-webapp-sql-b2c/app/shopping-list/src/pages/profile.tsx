import { useId, useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import { Camera, Download, KeyRound, LogOut, Mail, ShieldCheck, Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatar } from '@/components/profile/user-avatar'
import { PhotoDialog } from '@/components/profile/photo-dialog'
import { DeleteAccountDialog } from '@/components/profile/delete-account-dialog'
import { DetailsCard } from '@/components/profile/details-card'
import { ActivityCard } from '@/components/profile/activity-card'
import {
  useExportData,
  usePhotoUrl,
  useProfile,
  useRemovePhoto,
  useRevokeSessions,
  useSetThemePreference,
} from '@/hooks/use-profile'
import { useTheme } from '@/hooks/use-theme'
import { signOut, startPasswordReset } from '@/auth/account-actions'
import { THEME_PREFERENCES, type ThemePreference, type UserProfile } from '@/domain/profile'

const THEME_LABEL: Record<ThemePreference, string> = { light: 'Light', dark: 'Dark', system: 'System' }

export default function ProfilePage() {
  const q = useProfile()

  if (q.isLoading) return <ProfileSkeleton />
  if (q.isError || !q.data) {
    return (
      <div className="card-styled max-w-xl mx-auto text-center py-10">
        <h2 className="text-xl font-extrabold m-0 mb-2">Couldn’t load your profile</h2>
        <p className="muted-text m-0 mb-5">{q.error?.message ?? 'Please try again.'}</p>
        <button type="button" className="btn-cyan" onClick={() => void q.refetch()}>
          Try again
        </button>
      </div>
    )
  }
  return <Profile profile={q.data} />
}

function Profile({ profile }: { profile: UserProfile }) {
  const photoUrl = usePhotoUrl(profile)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const removePhoto = useRemovePhoto()

  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow">Account</p>
        <h2 className="text-[28px] font-extrabold m-0 tracking-tight">Your profile</h2>
        <p className="lede max-w-[620px]">
          Manage how you appear on the household’s shared lists. Details marked{' '}
          <span className="tag tag--entra !py-0.5">Entra</span> are saved to your sign-in account, so they
          follow you wherever you sign in.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          <section className="card-styled text-center !py-7" aria-label="Your account">
            <div className="relative inline-flex">
              <UserAvatar name={profile.displayName} photoUrl={photoUrl} size={120} ring alt="Your profile photo" />
              <button type="button" className="photo-cam" aria-label="Change profile photo" onClick={() => setPhotoOpen(true)}>
                <Camera className="size-[18px]" aria-hidden />
              </button>
            </div>
            <h3 className="text-[22px] font-extrabold mt-4 mb-0.5 break-words">{profile.displayName}</h3>
            <p className="muted-text text-sm m-0 break-all">{profile.email}</p>
            <div className="flex justify-center gap-2 flex-wrap mt-3.5">
              <span className="chip">
                <ShieldCheck className="size-3.5" aria-hidden />
                Entra External ID
              </span>
              {profile.memberSince && (
                <span className="chip">
                  Member since <span className="num">{format(new Date(profile.memberSince), 'MMM yyyy')}</span>
                </span>
              )}
            </div>
            <div className="flex justify-center gap-2 mt-4 flex-wrap">
              <button type="button" className="btn-ghost" onClick={() => setPhotoOpen(true)}>
                Change photo
              </button>
              {profile.hasPhoto && (
                <button
                  type="button"
                  className="btn-ghost danger"
                  disabled={removePhoto.isPending}
                  onClick={() => removePhoto.mutate()}
                >
                  Remove photo
                </button>
              )}
            </div>
          </section>

          <ActivityCard />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <DetailsCard profile={profile} />
          <PreferencesCard />
          <SecurityCard profile={profile} />
          <DataCard onDelete={() => setDeleteOpen(true)} />
        </div>
      </div>

      <PhotoDialog open={photoOpen} onOpenChange={setPhotoOpen} name={profile.displayName} currentPhotoUrl={photoUrl} />
      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  )
}

// ----- cards -----------------------------------------------------------------

function Card({ eyebrow, title, tag, children }: { eyebrow: string; title: string; tag?: ReactNode; children: ReactNode }) {
  const id = useId()
  return (
    <section className="card-styled" aria-labelledby={id}>
      <header className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3 id={id} className="text-xl font-bold m-0">{title}</h3>
        </div>
        {tag}
      </header>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  )
}

function Row({ icon, title, text, action, className = '' }: {
  icon?: ReactNode; title: string; text: ReactNode; action?: ReactNode; className?: string
}) {
  return (
    <div className={`list-tile flex-wrap ${className}`}>
      {/* basis-[220px]: on narrow screens the action wraps below instead of crushing the text */}
      <div className="flex gap-3 items-center min-w-0 flex-1 basis-[220px]">
        {icon && <span className="muted-text shrink-0">{icon}</span>}
        <div className="min-w-0">
          <p className="strong-text m-0">{title}</p>
          <p className="muted-text text-[13.5px] m-0">{text}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

function PreferencesCard() {
  const { theme } = useTheme()
  const setTheme = useSetThemePreference()
  return (
    <Card eyebrow="Preferences" title="App settings" tag={<span className="tag tag--local">Saved in Shopping List</span>}>
      <Row
        title="Theme"
        text="Applies on every device you sign in on."
        action={
          <div className="seg" role="group" aria-label="Theme">
            {THEME_PREFERENCES.map((t) => (
              <button key={t} type="button" aria-pressed={theme === t} onClick={() => setTheme(t)}>
                {THEME_LABEL[t]}
              </button>
            ))}
          </div>
        }
      />
    </Card>
  )
}

function SecurityCard({ profile }: { profile: UserProfile }) {
  const revoke = useRevokeSessions()
  return (
    <Card eyebrow="Security" title="Sign-in & security" tag={<span className="tag tag--entra">Managed by Entra External ID</span>}>
      <Row
        icon={<KeyRound className="size-5" aria-hidden />}
        title="Password"
        text="You’ll go to the secure sign-in page — choose “Forgot password?” to set a new one."
        action={
          <button type="button" className="btn-ghost" onClick={() => void startPasswordReset(profile.email)}>
            Change password
          </button>
        }
      />
      <Row
        icon={<Mail className="size-5" aria-hidden />}
        title="Two-step verification"
        text="A one-time code is emailed to you when you sign in."
        action={
          // Only claim it when the token proves it (amr contains "mfa"); External ID may omit amr.
          profile.mfaVerified && (
            <span className="tag tag--ok">
              <span className="size-2 rounded-full bg-[var(--status-delivered)]" aria-hidden />
              Used this session
            </span>
          )
        }
      />
      <Row
        icon={<LogOut className="size-5" aria-hidden />}
        title="Sign out everywhere"
        text="Ends your session on every device, this one included."
        action={
          <button
            type="button"
            className="btn-ghost"
            disabled={revoke.isPending}
            onClick={() => revoke.mutate(undefined, { onSuccess: () => void signOut() })}
          >
            {revoke.isPending ? 'Signing out…' : 'Sign out all devices'}
          </button>
        }
      />
    </Card>
  )
}

function DataCard({ onDelete }: { onDelete: () => void }) {
  const exportData = useExportData()
  return (
    <Card eyebrow="Your data" title="Export or delete">
      <Row
        title="Download my data"
        text="Your profile and activity as a JSON file."
        action={
          <button type="button" className="btn-ghost inline-flex items-center gap-2" disabled={exportData.isPending} onClick={() => exportData.mutate()}>
            <Download className="size-4" aria-hidden />
            Download
          </button>
        }
      />
      <Row
        className="danger-tile"
        title="Delete account"
        text="Removes your sign-in, photo and preferences. Shared lists stay, credited to “Former member”."
        action={
          <button type="button" className="btn-ghost danger inline-flex items-center gap-2" onClick={onDelete}>
            <Trash2 className="size-4" aria-hidden />
            Delete
          </button>
        }
      />
    </Card>
  )
}

function ProfileSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3" aria-busy="true" aria-label="Loading your profile">
      <Skeleton className="h-80 rounded-2xl" />
      <div className="lg:col-span-2 flex flex-col gap-4">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    </div>
  )
}
