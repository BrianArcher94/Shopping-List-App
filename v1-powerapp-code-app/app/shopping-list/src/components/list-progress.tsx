import { Check, NotebookPen, PackageCheck, ShoppingCart } from 'lucide-react'
import type { ListStatus } from '@/domain/types'

const STEPS: { status: ListStatus; icon: typeof Check }[] = [
  { status: 'Draft', icon: NotebookPen },
  { status: 'Ordered', icon: ShoppingCart },
  { status: 'Delivered', icon: PackageCheck },
]

const ORDER: Record<ListStatus, number> = { Draft: 0, Ordered: 1, Delivered: 2 }

interface ListProgressProps {
  status: ListStatus
  /** False while the list has no items — ordering an empty list makes no sense. */
  canOrder: boolean
  pending?: boolean
  onTransition: (status: ListStatus) => void
}

/**
 * Visualises the Draft → Ordered → Delivered lifecycle and offers the next
 * transition as a single contextual action.
 */
export function ListProgress({ status, canOrder, pending, onTransition }: ListProgressProps) {
  const position = ORDER[status]

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[var(--border-ink)] bg-[var(--tile-bg)] px-4 py-3 mb-4">
      <div className="stepper flex items-center flex-1" aria-label={`List status: ${status}`}>
        {STEPS.map(({ status: step, icon: Icon }, i) => {
          const state = i < position ? 'done' : i === position ? 'current' : ''
          return (
            <div key={step} className={`step flex items-center gap-2 ${state} ${i > 0 ? 'flex-1' : ''}`}>
              {i > 0 && <span className={`step-connector ${i <= position ? 'done' : ''}`} />}
              <span className="step-dot">
                {i < position ? <Check className="size-4" /> : <Icon className="size-4" />}
              </span>
              <span className="step-label">{step}</span>
            </div>
          )
        })}
      </div>

      {status === 'Draft' && (
        <button
          type="button"
          className="btn-cyan shrink-0 inline-flex items-center justify-center gap-2"
          disabled={!canOrder || pending}
          onClick={() => onTransition('Ordered')}
        >
          <ShoppingCart className="size-4" />
          Mark ordered
        </button>
      )}
      {status === 'Ordered' && (
        <button
          type="button"
          className="btn-cyan shrink-0 inline-flex items-center justify-center gap-2"
          disabled={pending}
          onClick={() => onTransition('Delivered')}
        >
          <PackageCheck className="size-4" />
          Mark delivered
        </button>
      )}
    </div>
  )
}
