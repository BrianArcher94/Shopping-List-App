import { useId, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DELETE_CONFIRMATION, FORMER_MEMBER_NAME } from '@/domain/profile'
import { useDeleteAccount } from '@/hooks/use-profile'
import { signOut } from '@/auth/account-actions'

interface DeleteAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after a successful delete, before sign-out. Tests and local mode use it. */
  onDeleted?: () => void
}

export function DeleteAccountDialog({ open, onOpenChange, onDeleted }: DeleteAccountDialogProps) {
  const inputId = useId()
  const [typed, setTyped] = useState('')
  const del = useDeleteAccount()
  const confirmed = typed === DELETE_CONFIRMATION

  async function confirm() {
    try {
      await del.mutateAsync(typed)
      onDeleted?.()
      await signOut() // the account no longer exists; clear the local session too
    } catch {
      // del.error is rendered below
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setTyped('')
          del.reset()
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-[480px]" role="alertdialog">
        <DialogHeader>
          <span className="inline-flex size-12 items-center justify-center rounded-[14px] bg-[rgba(248,113,113,0.12)] text-[var(--danger-ink)] mb-1">
            <TriangleAlert className="size-[22px]" aria-hidden />
          </span>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            This removes your Entra External ID sign-in, photo and preferences. It can’t be undone.
          </DialogDescription>
        </DialogHeader>
        <p className="muted-text text-sm m-0">
          Items and status changes you made on the household’s shared lists stay, credited to “
          {FORMER_MEMBER_NAME}”.
        </p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={inputId} className="text-[12.5px] font-semibold muted-text">
            Type {DELETE_CONFIRMATION} to confirm
          </label>
          <input
            id={inputId}
            className="field-input"
            value={typed}
            autoComplete="off"
            onChange={(e) => setTyped(e.target.value)}
          />
        </div>
        {del.error && (
          <p role="alert" className="field-error">
            {del.error.message}
          </p>
        )}
        <DialogFooter>
          <button type="button" className="btn-ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-ghost danger font-bold"
            disabled={!confirmed || del.isPending}
            onClick={confirm}
          >
            {del.isPending ? 'Deleting…' : 'Delete account'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
