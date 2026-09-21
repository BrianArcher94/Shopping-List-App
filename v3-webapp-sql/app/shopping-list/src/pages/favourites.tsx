import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useFavourites, useAddFavourite, useRemoveFavourite } from '@/hooks/use-shopping'

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

  if (q.isLoading) return <Skeleton className="h-48 rounded-2xl" />
  const favs = q.data ?? []

  return (
    <div className="space-y-4">
      <div className="card-styled">
        <header className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="eyebrow">Favourites</p>
            <h2 className="text-xl font-bold m-0">Add a favourite</h2>
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
              className="px-3 py-[10px] rounded-[10px] border border-[var(--border-ink)] bg-[rgba(255,255,255,0.02)] text-[var(--ink)] focus-visible:outline-none focus-visible:border-[var(--primary-strong)]"
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
              className="px-3 py-[10px] rounded-[10px] border border-[var(--border-ink)] bg-[rgba(255,255,255,0.02)] text-[var(--ink)] focus-visible:outline-none focus-visible:border-[var(--primary-strong)]"
            />
          </div>
          <button type="submit" disabled={!name.trim()} className="btn-cyan">
            Add favourite
          </button>
        </form>
      </div>

      <div className="card-styled">
        <header className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="eyebrow">Pool</p>
            <h2 className="text-xl font-bold m-0">Your favourites ({favs.length})</h2>
          </div>
        </header>
        <div className="flex flex-col gap-2.5">
          {favs.length === 0 ? (
            <p className="muted-text text-center py-6 m-0">No favourites yet.</p>
          ) : (
            favs.map((f) => (
              <div key={f.id} className="list-tile">
                <div>
                  <p className="strong-text m-0">{f.name}</p>
                  <p className="muted-text text-[13px] m-0">Qty: {f.defaultQuantity}</p>
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
