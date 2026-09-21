import { useParams, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/status-badge'
import { ListProgress } from '@/components/list-progress'
import { AddItemForm } from '@/components/add-item-form'
import { ItemRow } from '@/components/item-row'
import {
  useList,
  useListItems,
  useAddItem,
  useRemoveItem,
  useTransitionStatus,
  useUpdateItemNotes,
  useFavourites,
  useAddFavourite,
  useRemoveFavourite,
} from '@/hooks/use-shopping'
import type { ShoppingItem } from '@/domain/types'
import { isReadOnly } from '@/domain/rules'

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default function ListDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const listQ = useList(id)
  const itemsQ = useListItems(id)
  const addItem = useAddItem(id)
  const removeItem = useRemoveItem(id)
  const transition = useTransitionStatus(id)
  const updateNotes = useUpdateItemNotes(id)
  const favsQ = useFavourites()
  const addFavourite = useAddFavourite()
  const removeFavourite = useRemoveFavourite()

  const favs = favsQ.data ?? []

  function toggleFavourite(item: ShoppingItem, currentlyFavourite: boolean) {
    if (currentlyFavourite) {
      const existing = favs.find((f) => f.name.toLowerCase() === item.name.toLowerCase())
      if (existing) removeFavourite.mutate(existing.id)
    } else {
      addFavourite.mutate({ name: item.name, defaultQuantity: item.quantity })
    }
  }

  if (listQ.isLoading) return <Skeleton className="h-48 rounded-2xl" />
  if (!listQ.data) {
    return (
      <div className="card-styled max-w-2xl mx-auto">
        <p className="muted-text m-0 mb-4">List not found.</p>
        <Link to="/history" className="btn-ghost inline-block">← Back to history</Link>
      </div>
    )
  }

  const list = listQ.data
  const readOnly = isReadOnly(list)
  const items = itemsQ.data ?? []

  return (
    <div className="space-y-4">
      <Link to="/history" className="muted-text text-sm hover:text-[var(--ink)] inline-block">
        ← History
      </Link>
      <div className="card-styled">
        <header className="flex items-start justify-between gap-4 mb-5">
          <div className="min-w-0">
            <p className="eyebrow">Past list</p>
            <h2 className="text-2xl font-extrabold m-0 tracking-tight">
              Week of {format(parseIsoDate(list.weekStartDate), 'EEE d MMM')}
            </h2>
            <p className="muted-text num text-[13px] m-0 mt-1">
              {list.weekStartDate} → {list.weekEndDate}
            </p>
          </div>
          <StatusBadge status={list.status} />
        </header>

        <div className="stepper-panel mb-5">
          <ListProgress status={list.status} />
          <p className="muted-text num text-[13px] m-0 shrink-0">
            <span className="strong-text text-[var(--ink)]">{items.length}</span> item{items.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex gap-2 mb-3 flex-wrap">
          <button
            type="button"
            className="btn-cyan flex-1 min-w-[140px]"
            disabled={list.status !== 'Draft' || items.length === 0}
            onClick={() => transition.mutate('Ordered')}
          >
            Mark ordered
          </button>
          <button
            type="button"
            className="btn-cyan flex-1 min-w-[140px]"
            disabled={list.status !== 'Ordered'}
            onClick={() => transition.mutate('Delivered')}
          >
            Mark delivered
          </button>
        </div>

        {!readOnly && (
          <AddItemForm onAdd={(input) => addItem.mutate(input)} />
        )}
        {readOnly && (
          <p className="muted-text mb-3 m-0">
            This list is {list.status.toLowerCase()} and is read-only.
          </p>
        )}

        <div className="flex flex-col gap-2.5">
          {items.length === 0 ? (
            <p className="muted-text text-center py-6 m-0">No items.</p>
          ) : (
            items.map((item) => {
              const isFavourite = favs.some((f) => f.name.toLowerCase() === item.name.toLowerCase())
              return (
                <ItemRow
                  key={item.id}
                  item={item}
                  readOnly={readOnly}
                  isFavourite={isFavourite}
                  onRemove={(id) => removeItem.mutate(id)}
                  onUpdateNotes={(id, notes) => updateNotes.mutate({ itemId: id, notes })}
                  onToggleFavourite={toggleFavourite}
                />
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
