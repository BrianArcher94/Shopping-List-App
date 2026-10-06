import { Fragment } from 'react'
import { ClipboardList, ShoppingBasket, Truck, Check } from 'lucide-react'
import type { ListStatus } from '@/domain/types'

const ORDER: ListStatus[] = ['Draft', 'Ordered', 'Delivered']

const STEPS: { key: ListStatus; label: string; Icon: typeof ClipboardList }[] = [
  { key: 'Draft', label: 'Draft', Icon: ClipboardList },
  { key: 'Ordered', label: 'Ordered', Icon: ShoppingBasket },
  { key: 'Delivered', label: 'Delivered', Icon: Truck },
]

/**
 * Horizontal Draft → Ordered → Delivered progress stepper.
 * Derives entirely from `list.status` — no extra data required.
 */
export function ListProgress({ status }: { status: ListStatus }) {
  const activeIndex = ORDER.indexOf(status)

  return (
    <div className="stepper" role="list" aria-label={`Status: ${status}`}>
      {STEPS.map((step, i) => {
        const state = i < activeIndex ? 'done' : i === activeIndex ? 'current' : 'todo'
        const Icon = state === 'done' ? Check : step.Icon
        return (
          <Fragment key={step.key}>
            <div className={`step step--${state}`} role="listitem">
              <span className="step-dot">
                <Icon className="size-[15px]" strokeWidth={state === 'done' ? 3 : 2} />
              </span>
              <span className="step-name">{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <span className={`step-line ${i < activeIndex ? 'is-filled' : ''}`} aria-hidden />
            )}
          </Fragment>
        )
      })}
    </div>
  )
}
