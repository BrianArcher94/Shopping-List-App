import { useState, type FormEvent } from 'react'
import { Check, Scissors, Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useFavourites,
  useAddFavourite,
  useRemoveFavourite,
  useCurrentList,
  useListItems,
  useReuseFavourite,
} from '@/hooks/use-shopping'

export default function FavouritesPage() {
  const q = useFavourites()
  const add = useAddFavourite()
  const remove = useRemoveFavourite()

  // "Clip to this week" only makes sense while this week's list is still a Draft.
  const currentQ = useCurrentList()
  const draft = currentQ.data?.status === 'Draft' ? currentQ.data : null
  const itemsQ = useListItems(draft?.id)
  const reuse = useReuseFavourite(draft?.id ?? '')
  const onList = (name: string) =>
    (itemsQ.data ?? []).some((i) => i.name.toLowerCase() === name.toLowerCase())

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

  if (q.isLoading) return <Skeleton className="h-96 rounded-none" />
  const favs = q.data ?? []

  return (
    <div className="flex flex-col gap-7">
      <div className="flex justify-between items-end gap-6 flex-wrap">
        <div>
          <h1 className="display m-0 text-[52px]">Coupon book</h1>
          <p className="m-0 mt-1.5 text-[var(--soft-ink)]">
            Your regulars, each with a default quantity. {favs.length} saved.
          </p>
        </div>

        <form
          onSubmit={handleAdd}
          aria-label="New favourite"
          className="flex-[0_1_520px] p-3.5 bg-[var(--paper)] border-2 border-dashed border-[var(--ink)] rounded-md flex gap-2 flex-wrap items-end mono text-sm"
        >
          <div className="flex-[1_1_200px] flex flex-col gap-1">
            <label htmlFor="fav-name" className="field-label">
              Favourite name
            </label>
            <input
              id="fav-name"
              type="text"
              placeholder="E.G. OAT MILK"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field h-[46px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="fav-qty" className="field-label">
              Default qty
            </label>
            <input
              id="fav-qty"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              className="field h-[46px] w-[84px]"
            />
          </div>
          <button type="submit" disabled={!name.trim()} className="btn-solid h-[46px]">
            Save favourite
          </button>
        </form>
      </div>

      {favs.length === 0 ? (
        <p className="mono m-0 py-6 muted-text">No favourites yet. Save one above, or star an item on a receipt.</p>
      ) : (
        <ul className="list-none m-0 p-0 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
          {favs.map((f) => {
            const already = draft ? onList(f.name) : false
            return (
              <li key={f.id} className="coupon flex flex-col">
                <div className="p-4 pb-3 flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="display m-0 text-[26px] leading-[1.05] break-words">{f.name}</p>
                    <p className="mono m-0 mt-1 text-[13px] text-[var(--soft-ink)]">DEFAULT ×{f.defaultQuantity}</p>
                  </div>
                  <button
                    type="button"
                    className="btn-icon -mt-2.5 -mr-2.5"
                    onClick={() => remove.mutate(f.id)}
                    aria-label={`Remove ${f.name} from favourites`}
                  >
                    <Trash2 className="size-[18px]" />
                  </button>
                </div>
                {draft && (
                  <div className="mt-auto border-t-2 border-dashed border-[var(--rule)] px-4 py-2.5 mono text-[13px] font-semibold">
                    {already ? (
                      <span className="min-h-11 flex items-center gap-2 text-[var(--stamp-delivered)]">
                        <Check className="size-[18px]" aria-hidden />
                        ON THIS WEEK’S RECEIPT
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn-solid w-full"
                        disabled={reuse.isPending}
                        onClick={() => reuse.mutate(f.id)}
                        aria-label={`Clip ${f.name} to this week`}
                      >
                        <Scissors className="size-4" aria-hidden />
                        CLIP TO THIS WEEK
                      </button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
