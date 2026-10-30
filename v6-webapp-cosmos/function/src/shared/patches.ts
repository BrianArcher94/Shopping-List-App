import type { PatchOperation, PatchRequestBody } from '@azure/cosmos'
import type { ListStatus } from '../../domain/types'
import type { ItemDoc } from './docs'

// Pure builders for the conditional patches in repository.ts. A failed condition returns
// 412 Precondition Failed; the condition must take the form "FROM c WHERE ...".
// Statuses are interpolated only from the fixed ListStatus set, never from free text.

const STATUSES: readonly ListStatus[] = ['Draft', 'Ordered', 'Delivered']

export function statusIs(status: ListStatus): string {
  if (!STATUSES.includes(status)) throw new Error(`Unknown status ${status}`)
  return `FROM c WHERE c.status = '${status}'`
}

// Atomic compare-and-set: only applies if the list is still in the status we validated against,
// so two concurrent "Mark ordered" requests can't both succeed.
export function transitionPatch(current: ListStatus, next: ListStatus, now: string): PatchRequestBody {
  const operations: PatchOperation[] = [{ op: 'set', path: '/status', value: next }]
  if (next === 'Ordered')   operations.push({ op: 'set', path: '/orderedAt',   value: now })
  if (next === 'Delivered') operations.push({ op: 'set', path: '/deliveredAt', value: now })
  return { condition: statusIs(current), operations }
}

// Append to the embedded array only while the list is Draft — the editability check and the
// write are one operation (V5 checked, then inserted).
export function addItemPatch(item: ItemDoc): PatchRequestBody {
  return { condition: statusIs('Draft'), operations: [{ op: 'add', path: '/items/-', value: item }] }
}

// Index-based operations: pair these with an IfMatch ETag so the index can't go stale.
export const removeItemPatch = (index: number): PatchRequestBody =>
  [{ op: 'remove', path: `/items/${index}` }]

export const setNotesPatch = (index: number, notes: string): PatchRequestBody =>
  [{ op: 'set', path: `/items/${index}/notes`, value: notes }]
