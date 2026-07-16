import { useParams, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, ListPlus, Lock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { AddItemForm } from '@/components/add-item-form'
import { ItemRow } from '@/components/item-row'
import { ListProgress } from '@/components/list-progress'
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

function PageSkeleton() {
  return (
    <div className="card-styled space-y-4">
      <Skeleton className="h-8 w-56 rounded-lg" />
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-14 rounded-xl" />
      <Skeleton className="h-14 rounded-xl" />
    </div>
  )
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

  if (listQ.isLoading) return <PageSkeleton />
  if (!listQ.data) {
    return (
      <div className="card-styled max-w-2xl mx-auto rise-in">
        <p className="muted-text m-0 mb-4">List not found.</p>
        <Link to="/history" className="btn-ghost inline-flex items-center gap-2">
          <ArrowLeft className="size-4" />
          Back to history
        </Link>
      </div>
    )
  }

  const list = listQ.data
  const readOnly = isReadOnly(list)
  const items = itemsQ.data ?? []

  return (
    <div className="space-y-4">
      <Link
        to="/history"
        className="muted-text text-sm hover:text-[var(--ink)] inline-flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="size-4" />
        History
      </Link>
      <div className="card-styled rise-in">
        <header className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="eyebrow">Past list</p>
            <h2 className="text-2xl font-extrabold m-0 text-gradient">
              Week of {format(parseIsoDate(list.weekStartDate), 'EEE d MMM')}
            </h2>
          </div>
          <span className="chip">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </header>

        <ListProgress
          status={list.status}
          canOrder={items.length > 0}
          pending={transition.isPending}
          onTransition={(next) => transition.mutate(next)}
        />

        {!readOnly && (
          <AddItemForm onAdd={(input) => addItem.mutate(input)} />
        )}
        {readOnly && (
          <p className="readonly-banner mb-3 m-0">
            <Lock className="size-4 shrink-0" />
            This list is {list.status.toLowerCase()} and is read-only.
          </p>
        )}

        <div className="flex flex-col gap-2.5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="empty-hero-icon">
                <ListPlus className="size-6" />
              </span>
              <p className="muted-text m-0">No items.</p>
            </div>
          ) : (
            items.map((item, index) => {
              const isFavourite = favs.some((f) => f.name.toLowerCase() === item.name.toLowerCase())
              return (
                <ItemRow
                  key={item.id}
                  item={item}
                  index={index}
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
