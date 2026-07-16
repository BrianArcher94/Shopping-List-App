import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { CalendarPlus, ListPlus, Lock, Plus, ShoppingBasket, Sparkles, Star } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { AddItemForm } from '@/components/add-item-form'
import { ItemRow } from '@/components/item-row'
import { ListProgress } from '@/components/list-progress'
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

function PageSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
      <div className="card-styled lg:col-span-2 space-y-4">
        <Skeleton className="h-8 w-56 rounded-lg" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
      <div className="card-styled space-y-4">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
    </div>
  )
}

export default function CurrentListPage() {
  const currentQ = useCurrentList()

  if (currentQ.isLoading) return <PageSkeleton />

  if (!currentQ.data) return <EmptyState />

  return <CurrentList listId={currentQ.data.id} />
}

function EmptyState() {
  const create = useCreateThisWeekList()
  return (
    <div className="card-styled max-w-xl mx-auto text-center rise-in">
      <div className="flex flex-col items-center gap-4 py-6">
        <span className="empty-hero-icon">
          <ShoppingBasket className="size-7" />
        </span>
        <div>
          <p className="eyebrow">Current list</p>
          <h2 className="text-2xl font-extrabold m-0 text-gradient">No list for this week yet</h2>
        </div>
        <p className="muted-text m-0 max-w-md">
          The weekly list is normally created automatically on Saturday at 20:00. You can start it
          manually for this week, or create a new list for any other Sunday.
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
          <button
            type="button"
            className="btn-cyan inline-flex items-center gap-2"
            onClick={() => create.mutate()}
            disabled={create.isPending}
          >
            <Sparkles className="size-4" />
            Start this week’s list
          </button>
          <CreateListDialog
            trigger={
              <button type="button" className="btn-ghost inline-flex items-center gap-2">
                <CalendarPlus className="size-4" />
                Pick another week
              </button>
            }
          />
        </div>
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
      <div className="card-styled lg:col-span-2 rise-in">
        <header className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="eyebrow">Current list</p>
            <h2 className="text-2xl font-extrabold m-0 text-gradient">
              Week of {format(parseIsoDate(list.weekStartDate), 'EEE d MMM')}
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="chip">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
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
              <p className="muted-text m-0">No items yet — add your first one above.</p>
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
                  onToggleFavourite={(it, current) => toggleFavourite(it, current, favs)}
                />
              )
            })
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="card-styled lg:col-span-1 rise-in" style={{ animationDelay: '80ms' }}>
          <header className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="eyebrow">Favourites</p>
              <h2 className="text-xl font-bold m-0">Quick add</h2>
            </div>
            <Link to="/favourites" className="muted-text text-sm hover:text-[var(--ink)] transition-colors">
              Manage →
            </Link>
          </header>
          {favsNotOnList.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span className="empty-hero-icon">
                <Star className="size-5" />
              </span>
              <p className="muted-text text-sm m-0">
                {favs.length === 0
                  ? 'No favourites yet. Star an item or add some on the Favourites tab.'
                  : 'Every favourite is already on this list. Nice.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {favsNotOnList.map((f, index) => (
                <div key={f.id} className="list-tile rise-in" style={{ animationDelay: `${index * 40}ms` }}>
                  <div className="min-w-0 flex items-center gap-2">
                    <Star className="size-4 shrink-0 text-[var(--primary-ink)]" fill="currentColor" />
                    <div className="min-w-0">
                      <p className="strong-text m-0 truncate">{f.name}</p>
                      <p className="muted-text text-[13px] m-0">
                        <span className="qty-pill">×{f.defaultQuantity}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost shrink-0 inline-flex items-center gap-1.5"
                    onClick={() => reuse.mutate(f.id)}
                    aria-label={`Add ${f.name}`}
                  >
                    <Plus className="size-4" />
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
