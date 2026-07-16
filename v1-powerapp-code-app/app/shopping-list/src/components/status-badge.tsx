import type { ListStatus } from '@/domain/types'

const STATUS_CLASS: Record<ListStatus, string> = {
  Draft: 'chip-draft',
  Ordered: 'chip-ordered',
  Delivered: 'chip-delivered',
}

export function StatusBadge({ status }: { status: ListStatus }) {
  return (
    <span className={`chip ${STATUS_CLASS[status]}`}>
      <span className="chip-dot" aria-hidden="true" />
      {status}
    </span>
  )
}
