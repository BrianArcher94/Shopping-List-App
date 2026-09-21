import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/status-badge'
import { ListProgress } from '@/components/list-progress'
import { AddItemForm } from '@/components/add-item-form'
import { ItemRow } from '@/components/item-row'
import { CreateListDialog } from '@/components/create-list-dialog'
import {
  useCurrentList,
  useListItems,
  useFavourites,
  useAddItem,
  useRemoveItem,
  useTransitionStatus,
  useCreateThisWeekList,
  useReuseFavourite,
  useUpdateItemNotes,
  useAddFavourite,
  useRemoveFavourite,
} from '@/hooks/use-shopping'
import type { ShoppingItem, FavouriteItem } from '@/domain/types'
import { isReadOnly } from '@/domain/rules'

function parseIsoDate(iso: string): Date {
  // Slice to YYYY-MM-DD in case the value carries a time component.
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default function CurrentListPage() {
  const currentQ = useCurrentList()

  if (currentQ.isLoading) return <Skeleton className="h-48 rounded-2xl" />

  if (!currentQ.data) return <EmptyState />

  return <CurrentList listId={currentQ.data.id} />
}

function EmptyState() {
  const create = useCreateThisWeekList()
  return (
    <div className="card-styled max-w-2xl mx-auto text-center py-10">
      <span className="empty-art mx-auto mb-5">
        <Plus className="size-8" />
      </span>
      <h2 className="text-2xl font-extrabold m-0 mb-2">No list for this week yet</h2>
      <p className="muted-text max-w-md mx-auto mb-6 m-0">
        The weekly list is normally created automatically on Saturday at 20:00. You can start it
        manually for this week, or create a new list for any other Sunday.
      </p>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <button
          type="button"
          className="btn-cyan"
          onClick={() => create.mutate()}
          disabled={create.isPending}
        >
          Start this week’s list
        </button>
        <CreateListDialog
          trigger={
            <button type="button" className="btn-ghost inline-flex items-center gap-2">
              <Plus className="size-4" />
              New list
            </button>
          }
        />
      </div>
    </div>
  )
}

function CurrentList({ listId }: { listId: string }) {
  const listQ = useCurrentList()
  const itemsQ = useListItems(listId)
  const favsQ = useFavourites()
  const addItem = useAddItem(listId)
  const removeItem = useRemoveItem(listId)
  const transition = useTransitionStatus(listId)
  const reuse = useReuseFavourite(listId)
  const updateNotes = useUpdateItemNotes(listId)
  const addFavourite = useAddFavourite()
  const removeFavourite = useRemoveFavourite()

  function toggleFavourite(item: ShoppingItem, currentlyFavourite: boolean, favourites: FavouriteItem[]) {
    if (currentlyFavourite) {
      const existing = favourites.find((f) => f.name.toLowerCase() === item.name.toLowerCase())
      if (existing) removeFavourite.mutate(existing.id)
    } else {
      addFavourite.mutate({ name: item.name, defaultQuantity: item.quantity })
    }
  }

  const list = listQ.data
  if (!list) return null

  const readOnly = isReadOnly(list)
  const items = itemsQ.data ?? []
  const favs = favsQ.data ?? []
  const favsNotOnList = favs.filter(
    (f) => !items.some((i) => i.name.toLowerCase() === f.name.toLowerCase()),
  )

  return (
    <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
      <div className="card-styled lg:col-span-2">
        <header className="flex items-start justify-between gap-4 mb-5">
          <div className="min-w-0">
            <p className="eyebrow">This week</p>
            <h2 className="text-2xl font-extrabold m-0 tracking-tight">
              Week of {format(parseIsoDate(list.weekStartDate), 'EEE d MMM')}
            </h2>
            <p className="muted-text num text-[13px] m-0 mt-1">
              {list.weekStartDate} → {list.weekEndDate}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
            <StatusBadge status={list.status} />
            <CreateListDialog
              trigger={
                <button type="button" className="btn-ghost inline-flex items-center gap-2" aria-label="Create a new list">
                  <Plus className="size-4" />
                  New list
                </button>
              }
            />
          </div>
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
            <p className="muted-text text-center py-6 m-0">No items yet.</p>
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
                  onToggleFavourite={(it, current) => toggleFavourite(it, current, favs)}
                />
              )
            })
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="card-styled lg:col-span-1">
          <header className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="eyebrow">Favourites</p>
              <h2 className="text-xl font-bold m-0">Quick add</h2>
            </div>
            <Link to="/favourites" className="muted-text text-sm hover:text-[var(--ink)]">
              Manage →
            </Link>
          </header>
          {favsNotOnList.length === 0 ? (
            <p className="muted-text text-sm m-0 py-2">
              {favs.length === 0
                ? 'No favourites yet. Add some on the Favourites tab.'
                : 'Every favourite is already on this list. Nice.'}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {favsNotOnList.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="qchip"
                  onClick={() => reuse.mutate(f.id)}
                  aria-label={`Add ${f.name}`}
                >
                  <Plus className="size-[14px]" />
                  {f.name}
                  <span className="qchip-qty num">×{f.defaultQuantity}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
