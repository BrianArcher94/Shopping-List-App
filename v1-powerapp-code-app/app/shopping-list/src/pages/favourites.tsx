import { useState, type FormEvent } from 'react'
import { Star, Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useFavourites, useAddFavourite, useRemoveFavourite } from '@/hooks/use-shopping'

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="card-styled space-y-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
      <div className="card-styled space-y-4">
        <Skeleton className="h-8 w-56 rounded-lg" />
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
    </div>
  )
}

export default function FavouritesPage() {
  const q = useFavourites()
  const add = useAddFavourite()
  const remove = useRemoveFavourite()

  const [name, setName] = useState('')
  const [qty, setQty] = useState(1)

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    add.mutate(
      { name: trimmed, defaultQuantity: qty },
      {
        onSuccess: () => {
          setName('')
          setQty(1)
        },
      },
    )
  }

  if (q.isLoading) return <PageSkeleton />
  const favs = q.data ?? []

  const inputCls =
    'px-3 py-[10px] rounded-[10px] border border-[var(--border-ink)] bg-[var(--tile-bg)] text-[var(--ink)] focus-visible:outline-none focus-visible:border-[var(--primary-strong)] transition-colors'

  return (
    <div className="space-y-4">
      <div className="card-styled rise-in">
        <header className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="eyebrow">Favourites</p>
            <h2 className="text-2xl font-extrabold m-0 text-gradient">Add a favourite</h2>
          </div>
        </header>
        <form
          onSubmit={handleAdd}
          className="grid gap-2 items-end"
          style={{ gridTemplateColumns: '1.5fr 0.5fr auto' }}
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="fav-name" className="text-[12px] muted-text">
              Item
            </label>
            <input
              id="fav-name"
              type="text"
              aria-label="Favourite name"
              placeholder="e.g. Eggs"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="fav-qty" className="text-[12px] muted-text">
              Qty
            </label>
            <input
              id="fav-qty"
              type="number"
              aria-label="Default quantity"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              className={inputCls}
            />
          </div>
          <button type="submit" disabled={!name.trim()} className="btn-cyan">
            Add favourite
          </button>
        </form>
      </div>

      <div className="card-styled rise-in" style={{ animationDelay: '80ms' }}>
        <header className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="eyebrow">Pool</p>
            <h2 className="text-xl font-bold m-0">Your favourites ({favs.length})</h2>
          </div>
        </header>
        <div className="flex flex-col gap-2.5">
          {favs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="empty-hero-icon">
                <Star className="size-6" />
              </span>
              <p className="muted-text m-0">No favourites yet.</p>
              <p className="muted-text text-sm m-0">
                Favourites are one tap away from any week’s list — add staples like milk or bread.
              </p>
            </div>
          ) : (
            favs.map((f, index) => (
              <div
                key={f.id}
                className="list-tile rise-in"
                style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Star className="size-4 shrink-0 text-[var(--primary-ink)]" fill="currentColor" />
                  <div className="min-w-0">
                    <p className="strong-text m-0 truncate">{f.name}</p>
                    <p className="m-0">
                      <span className="qty-pill">×{f.defaultQuantity}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-icon danger"
                  onClick={() => remove.mutate(f.id)}
                  aria-label={`Remove ${f.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
