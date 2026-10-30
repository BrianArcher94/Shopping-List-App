import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { Receipt, ReceiptHeader, ReceiptTotal } from '@/components/receipt'
import { StatusBadge } from '@/components/status-badge'
import { ItemRow } from '@/components/item-row'
import { useListHistory, useListItems, useTransitionStatus } from '@/hooks/use-shopping'
import { getCurrentWeekStart } from '@/domain/rules'
import type { ShoppingList } from '@/domain/types'
import { monthLabel, stampTime, weekRangeLabel } from '@/lib/format'

export default function HistoryPage() {
  const q = useListHistory()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const receiptRef = useRef<HTMLDivElement>(null)

  function pick(id: string) {
    setSelectedId(id)
    // On a phone the receipt sits below the stubs — bring it into view.
    if (window.matchMedia?.('(max-width: 767px)').matches) {
      receiptRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    }
  }

  if (q.isLoading) return <Skeleton className="h-96 rounded-none" />
  // History shows only weeks that have already passed — exclude the current week
  // (shown on This week) and any future-dated lists.
  const currentWeekStart = getCurrentWeekStart(new Date())
  const lists = (q.data ?? []).filter((l) => l.weekStartDate.slice(0, 10) < currentWeekStart)
  const selected = lists.find((l) => l.id === selectedId) ?? lists[0]

  const groups: { month: string; lists: ShoppingList[] }[] = []
  for (const l of lists) {
    const month = monthLabel(l.weekStartDate)
    const group = groups.find((g) => g.month === month)
    if (group) group.lists.push(l)
    else groups.push({ month, lists: [l] })
  }

  return (
    <div className="flex gap-10 flex-wrap items-start">
      <div className="flex-[1_1_340px] max-w-[440px] flex flex-col gap-5">
        <div>
          <h1 className="display m-0 text-[52px]">Old receipts</h1>
          <p className="m-0 mt-1.5 text-[var(--soft-ink)]">
            Every past week, filed. Pick one to read it. They can’t be changed.
          </p>
        </div>

        {lists.length === 0 ? (
          <p className="mono m-0 py-6 muted-text">No lists yet.</p>
        ) : (
          groups.map((g) => (
            <section key={g.month} className="flex flex-col gap-2" aria-label={g.month}>
              <h2 className="mono m-0 text-[13px] font-semibold text-[var(--soft-ink)]">— {g.month} —</h2>
              {g.lists.map((l) => {
                const isSelected = l.id === selected?.id
                return (
                  <button
                    key={l.id}
                    type="button"
                    className={`stub stub--${l.status.toLowerCase()} ${isSelected ? 'is-selected' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => pick(l.id)}
                  >
                    <span className="flex flex-col min-w-0">
                      <span className="font-semibold uppercase">
                        {weekRangeLabel(l.weekStartDate, l.weekEndDate)}
                      </span>
                      <span className="text-xs opacity-80">
                        {l.weekStartDate.slice(0, 10)} → {l.weekEndDate.slice(0, 10)}
                      </span>
                    </span>
                    <StatusBadge status={l.status} className="text-lg" />
                  </button>
                )
              })}
            </section>
          ))
        )}
      </div>

      {selected && (
        <div ref={receiptRef} className="flex-[999_1_460px] max-w-[560px] min-w-0 scroll-mt-4">
          <HistoryReceipt key={selected.id} list={selected} />
        </div>
      )}
    </div>
  )
}

function HistoryReceipt({ list }: { list: ShoppingList }) {
  const itemsQ = useListItems(list.id)
  const transition = useTransitionStatus(list.id)
  const items = itemsQ.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <Receipt labelledBy="history-receipt-title">
        <ReceiptHeader
          id="history-receipt-title"
          eyebrow="PAST LIST"
          title={weekRangeLabel(list.weekStartDate, list.weekEndDate)}
          stamp={<StatusBadge status={list.status} className="stamp--hero" />}
        />
        {items.length === 0 ? (
          <p className="rule m-0 py-6 text-center muted-text">NO ITEMS ON THIS RECEIPT.</p>
        ) : (
          <ul className="rule list-none m-0 py-3 px-0 text-[var(--soft-ink)]">
            {items.map((item) => (
              <ItemRow key={item.id} item={item} readOnly />
            ))}
          </ul>
        )}
        <div className="pt-3.5 flex flex-col gap-1">
          <ReceiptTotal label="OPENED" value={stampTime(list.createdAt)} />
          <ReceiptTotal label="ORDERED" value={stampTime(list.orderedAt)} />
          <ReceiptTotal label="DELIVERED" value={stampTime(list.deliveredAt)} />
          <ReceiptTotal label="ITEMS" value={items.length} />
        </div>
      </Receipt>

      <div className="flex gap-3 flex-wrap items-center">
        {list.status === 'Ordered' && (
          <button
            type="button"
            className="btn-solid"
            disabled={transition.isPending}
            onClick={() => transition.mutate('Delivered')}
          >
            Stamp it delivered
          </button>
        )}
        <Link to={`/list/${list.id}`} className="link-mono">
          OPEN ON ITS OWN PAGE →
        </Link>
      </div>
    </div>
  )
}
