import type { ListStatus, ShoppingList } from '@/domain/types'
import { stampTime } from '@/lib/format'

const ORDER: ListStatus[] = ['Draft', 'Ordered', 'Delivered']

/**
 * Draft → Ordered → Delivered as three numbered receipt lines, each with the time
 * it happened. Derives entirely from the list's status and timestamps.
 */
export function ListProgress({ list }: { list: ShoppingList }) {
  const activeIndex = ORDER.indexOf(list.status)
  const times = [list.createdAt, list.orderedAt, list.deliveredAt]

  return (
    <ol className="list-none m-0 p-0 flex flex-col gap-2" aria-label={`Status: ${list.status}`}>
      {ORDER.map((step, i) => {
        const state = i < activeIndex ? 'done' : i === activeIndex ? 'current' : 'todo'
        return (
          <li key={step} className={`step step--${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="font-semibold">
              {String(i + 1).padStart(2, '0')} {step.toUpperCase()}
            </span>
            <span>
              {state === 'todo' ? '—' : stampTime(times[i])}
              {state === 'done' && ' ✓'}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
