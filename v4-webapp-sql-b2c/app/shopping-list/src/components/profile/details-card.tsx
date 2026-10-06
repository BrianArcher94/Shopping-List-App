import { useEffect, useId, useState, type FormEvent } from 'react'
import { Lock, RefreshCw } from 'lucide-react'
import { PROFILE_LIMITS, type ProfileDetails, type UserProfile } from '@/domain/profile'
import { useUpdateProfile } from '@/hooks/use-profile'

const pick = (p: UserProfile): ProfileDetails => ({
  displayName: p.displayName,
  givenName: p.givenName,
  surname: p.surname,
  city: p.city,
  country: p.country,
})

const FIELDS: { key: keyof ProfileDetails; label: string; autoComplete: string; optional?: boolean; wide?: boolean }[] = [
  { key: 'displayName', label: 'Display name', autoComplete: 'nickname', wide: true },
  { key: 'givenName', label: 'First name', autoComplete: 'given-name', optional: true },
  { key: 'surname', label: 'Last name', autoComplete: 'family-name', optional: true },
  { key: 'city', label: 'Town or city', autoComplete: 'address-level2', optional: true },
  { key: 'country', label: 'Country or region', autoComplete: 'country-name', optional: true },
]

/** Personal details - every field is written back to the Entra External ID user. */
export function DetailsCard({ profile }: { profile: UserProfile }) {
  const id = useId()
  const saved = pick(profile)
  const [draft, setDraft] = useState<ProfileDetails>(saved)
  const update = useUpdateProfile()

  // Re-seed when the saved profile changes underneath (e.g. after a save).
  const savedKey = JSON.stringify(saved)
  useEffect(() => {
    setDraft(JSON.parse(savedKey) as ProfileDetails)
  }, [savedKey])

  const dirty = (Object.keys(saved) as (keyof ProfileDetails)[]).some((k) => draft[k] !== saved[k])
  const nameMissing = draft.displayName.trim() === ''

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!dirty || nameMissing) return
    update.mutate(draft)
  }

  let status: { text: string; dot: string; strong?: boolean }
  if (update.isPending) status = { text: 'Syncing to Entra External ID…', dot: 'var(--primary-ink)' }
  else if (update.isError) status = { text: update.error.message, dot: 'var(--danger-ink)', strong: true }
  else if (dirty) status = { text: 'Unsaved changes', dot: 'var(--status-ordered)', strong: true }
  else status = { text: 'Up to date with Entra External ID', dot: 'var(--status-delivered)' }

  return (
    <section className="card-styled" aria-labelledby={`${id}-h`}>
      <header className="flex items-start justify-between gap-3 mb-5 flex-wrap">
        <div>
          <p className="eyebrow">Personal details</p>
          <h3 id={`${id}-h`} className="text-xl font-bold m-0">How you appear</h3>
        </div>
        <span className="tag tag--entra">
          <RefreshCw className="size-[13px]" aria-hidden />
          Syncs to Entra External ID
        </span>
      </header>

      <form onSubmit={onSubmit} noValidate>
        <div className="grid gap-3.5 sm:grid-cols-2">
          {FIELDS.map((f) => {
            const inputId = `${id}-${f.key}`
            const invalid = f.key === 'displayName' && nameMissing
            return (
              <div key={f.key} className={`flex flex-col gap-1.5 ${f.wide ? 'sm:col-span-2' : ''}`}>
                <label htmlFor={inputId} className="text-[12.5px] font-semibold muted-text">
                  {f.label}
                  {f.optional && <span className="font-medium"> (optional)</span>}
                </label>
                <input
                  id={inputId}
                  className="field-input"
                  value={draft[f.key]}
                  maxLength={PROFILE_LIMITS[f.key]}
                  autoComplete={f.autoComplete}
                  aria-invalid={invalid || undefined}
                  aria-describedby={f.key === 'displayName' ? `${inputId}-hint` : undefined}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                />
                {invalid && <p className="field-error">Display name can’t be empty.</p>}
                {f.key === 'displayName' && (
                  <p id={`${inputId}-hint`} className="muted-text text-[12.5px] m-0">
                    Shown next to items and status changes you make. Earlier entries keep the name you
                    had at the time.
                  </p>
                )}
              </div>
            )
          })}

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor={`${id}-email`} className="text-[12.5px] font-semibold muted-text">
              Sign-in email
            </label>
            <div className="relative">
              <input
                id={`${id}-email`}
                className="field-input pr-10"
                value={profile.email}
                readOnly
                aria-describedby={`${id}-email-hint`}
              />
              <Lock className="size-4 absolute right-3.5 top-3.5 muted-text" aria-hidden />
            </div>
            <p id={`${id}-email-hint`} className="muted-text text-[12.5px] m-0">
              This is your sign-in identity, so it can’t be changed here.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap mt-5 pt-4 border-t border-[var(--border-ink)]">
          <p role="status" aria-live="polite" className="m-0 inline-flex items-center gap-2 text-[13.5px] font-semibold">
            <span className="size-2 rounded-full shrink-0" style={{ background: status.dot }} aria-hidden />
            <span className={status.strong ? '' : 'muted-text'}>{status.text}</span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-ghost"
              disabled={!dirty || update.isPending}
              onClick={() => {
                setDraft(saved)
                update.reset()
              }}
            >
              Discard
            </button>
            <button type="submit" className="btn-cyan" disabled={!dirty || nameMissing || update.isPending}>
              {update.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}
