import type { ListStatus } from '@/domain/types'

const VARIANT: Record<ListStatus, string> = {
  Draft: 'stamp--draft',
  Ordered: 'stamp--ordered',
  Delivered: 'stamp--delivered',
}

/**
 * The list status as a rubber stamp. Keeps the `status-badge` class so tests and
 * callers can find "the" status element apart from the step labels.
 */
export function StatusBadge({ status, className = '' }: { status: ListStatus; className?: string }) {
  return <span className={`status-badge stamp ${VARIANT[status]} ${className}`}>{status}</span>
}
