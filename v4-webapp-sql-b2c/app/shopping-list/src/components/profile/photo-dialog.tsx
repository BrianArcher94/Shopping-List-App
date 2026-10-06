import { useEffect, useId, useRef, useState, type DragEvent } from 'react'
import { Upload } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { UserAvatar } from './user-avatar'
import { PHOTO_ACCEPT, checkPhotoFile, renderCroppedJpeg } from '@/lib/photo'
import { useUploadPhoto } from '@/hooks/use-profile'

interface PhotoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  currentPhotoUrl: string | null
}

/** Pick an image, zoom the centre-square crop, upload it as a 512 px JPEG. */
export function PhotoDialog({ open, onOpenChange, name, currentPhotoUrl }: PhotoDialogProps) {
  const inputId = useId()
  const imgRef = useRef<HTMLImageElement>(null)
  const [draftUrl, setDraftUrl] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const upload = useUploadPhoto()

  // Revoke the draft's object URL when it is replaced or the dialog closes.
  useEffect(() => () => { if (draftUrl) URL.revokeObjectURL(draftUrl) }, [draftUrl])

  function reset() {
    setDraftUrl(null)
    setZoom(1)
    setError(null)
    setDragging(false)
  }

  function choose(file: File | undefined) {
    if (!file) return
    const problem = checkPhotoFile(file)
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    setZoom(1)
    setDraftUrl(URL.createObjectURL(file))
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    choose(e.dataTransfer.files?.[0])
  }

  async function save() {
    if (!imgRef.current) return
    setBusy(true)
    try {
      const jpeg = await renderCroppedJpeg(imgRef.current, zoom)
      await upload.mutateAsync(jpeg)
      reset()
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the photo')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <p className="eyebrow">Profile photo</p>
          <DialogTitle>Update your photo</DialogTitle>
          <DialogDescription>
            Shown on your profile and next to your name in the app. Your photo is kept by
            Shopping List — Entra External ID doesn’t store profile photos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-2">
          {draftUrl ? (
            <span className="avatar avatar--ring" style={{ width: 168, height: 168 }}>
              <img
                ref={imgRef}
                src={draftUrl}
                alt="Preview of your new photo"
                style={{ transform: `scale(${zoom})` }}
                onError={() => {
                  setError('That file couldn’t be read as an image.')
                  setDraftUrl(null)
                }}
              />
            </span>
          ) : (
            <UserAvatar name={name} photoUrl={currentPhotoUrl} size={168} ring alt="Your current photo" />
          )}
        </div>

        {draftUrl && (
          <div className="flex flex-col gap-1">
            <label htmlFor={`${inputId}-zoom`} className="text-[12.5px] font-semibold muted-text">
              Zoom
            </label>
            <input
              id={`${inputId}-zoom`}
              type="range"
              min={1}
              max={2.5}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-[var(--primary-strong)]"
            />
          </div>
        )}

        <div
          className={`drop-zone ${dragging ? 'is-dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <Upload className="size-6 text-[var(--primary-strong)]" aria-hidden />
          <input
            id={inputId}
            type="file"
            accept={PHOTO_ACCEPT}
            className="sr-only"
            onChange={(e) => {
              choose(e.target.files?.[0])
              e.target.value = '' // allow re-picking the same file
            }}
          />
          <label htmlFor={inputId} className="btn-ghost inline-flex items-center cursor-pointer">
            {draftUrl ? 'Choose a different image' : 'Choose an image'}
          </label>
          <p className="muted-text text-[13px] m-0">
            JPG, PNG or WebP, up to <span className="num">10 MB</span>. Cropped to a square — or drop a file here.
          </p>
        </div>

        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}

        <DialogFooter>
          <button type="button" className="btn-ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button type="button" className="btn-cyan" disabled={!draftUrl || busy} onClick={save}>
            {busy ? 'Saving…' : 'Save photo'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
