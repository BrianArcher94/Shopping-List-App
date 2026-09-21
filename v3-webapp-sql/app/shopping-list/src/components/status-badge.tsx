import type { ListStatus } from '@/domain/types'

const VARIANT: Record<ListStatus, string> = {
  Draft: 'status-badge--draft',
  Ordered: 'status-badge--ordered',
  Delivered: 'status-badge--delivered',
}

export function StatusBadge({ status }: { status: ListStatus }) {
  return (
    <span className={`status-badge ${VARIANT[status]}`}>
      <span className="dot" aria-hidden />
      {status}
    </span>
  )
}
