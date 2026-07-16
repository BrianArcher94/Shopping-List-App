import { type ReactNode, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { useCreateList } from '@/hooks/use-shopping'

interface CreateListDialogProps {
  trigger: ReactNode
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function CreateListDialog({ trigger }: CreateListDialogProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Date | undefined>(undefined)
  const navigate = useNavigate()
  const create = useCreateList()

  function handleCreate() {
    if (!selected) return
    const weekStartDate = toIsoDate(selected)
    create.mutate(weekStartDate, {
      onSuccess: (list) => {
        setOpen(false)
        setSelected(undefined)
        navigate(`/list/${list.id}`)
      },
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setSelected(undefined)
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>New shopping list</DialogTitle>
          <DialogDescription>
            Pick the Sunday that starts the week. Other days are disabled — a list always covers
            Sunday → Saturday.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-2">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={setSelected}
            disabled={(date) => date.getDay() !== 0}
            showOutsideDays={false}
          />
        </div>
        {selected && (
          <p className="muted-text text-sm text-center m-0">
            Week of {toIsoDate(selected)} → list will be created as Draft.
          </p>
        )}
        <DialogFooter>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-cyan"
            disabled={!selected || create.isPending}
            onClick={handleCreate}
          >
            {create.isPending ? 'Creating…' : 'Create list'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
