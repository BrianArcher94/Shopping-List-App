import { Link } from 'react-router-dom'
import { Lock, Plus } from 'lucide-react'
import { Receipt, ReceiptHeader, ReceiptTotal } from '@/components/receipt'
import { StatusBadge } from '@/components/status-badge'
import { ListProgress } from '@/components/list-progress'
import { AddItemForm } from '@/components/add-item-form'
import { ItemRow } from '@/components/item-row'
import { CreateListDialog } from '@/components/create-list-dialog'
import {
  useListItems,
  useFavourites,
  useAddItem,
  useRemoveItem,
  useTransitionStatus,
  useReuseFavourite,
  useUpdateItemNotes,
  useAddFavourite,
  useRemoveFavourite,
} from '@/hooks/use-shopping'
import type { ShoppingItem, ShoppingList } from '@/domain/types'
import { isReadOnly } from '@/domain/rules'
import { nextListOpensLabel, stampTime, weekRangeLabel } from '@/lib/format'

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/**
 * A week's list as a till receipt, with the status steps, the one forward action
 * and the favourite "coupons" beside it. Used by This week and by /list/:id.
 */
export function ListWorkspace({ list }: { list: ShoppingList }) {
  const itemsQ = useListItems(list.id)
  const favsQ = useFavourites()
  const addItem = useAddItem(list.id)
  const removeItem = useRemoveItem(list.id)
  const transition = useTransitionStatus(list.id)
  const reuse = useReuseFavourite(list.id)
  const updateNotes = useUpdateItemNotes(list.id)
  const addFavourite = useAddFavourite()
  const removeFavourite = useRemoveFavourite()

  const readOnly = isReadOnly(list)
  const items = itemsQ.data ?? []
  const favs = favsQ.data ?? []
  const favsOnList = favs.filter((f) => items.some((i) => sameName(i.name, f.name)))
  const coupons = favs.filter((f) => !items.some((i) => sameName(i.name, f.name)))

  function toggleFavourite(item: ShoppingItem, currentlyFavourite: boolean) {
    if (currentlyFavourite) {
      const existing = favs.find((f) => sameName(f.name, item.name))
      if (existing) removeFavourite.mutate(existing.id)
    } else {
      addFavourite.mutate({ name: item.name, defaultQuantity: item.quantity })
    }
  }

  return (
    <div className="flex gap-10 flex-wrap items-start justify-center">
      <Receipt
        className="flex-[0_1_540px] min-w-0"
        labelledBy="receipt-title"
      >
        <ReceiptHeader
          id="receipt-title"
          eyebrow="SHOPPING LIST · WEEK OF"
          title={weekRangeLabel(list.weekStartDate, list.weekEndDate)}
          subtitle={`OPENED ${stampTime(list.createdAt)}`}
          stamp={<StatusBadge status={list.status} className="stamp--hero" />}
        />

        {items.length === 0 ? (
          <p className="rule m-0 py-6 text-center muted-text">NOTHING ON THE RECEIPT YET.</p>
        ) : (
          <ul className="rule list-none m-0 py-3 px-0">
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                readOnly={readOnly}
                isFavourite={favs.some((f) => sameName(f.name, item.name))}
                onRemove={(id) => removeItem.mutate(id)}
                onUpdateNotes={(id, notes) => updateNotes.mutate({ itemId: id, notes })}
                onToggleFavourite={toggleFavourite}
              />
            ))}
          </ul>
        )}

        <div className="rule py-3.5 flex flex-col gap-1">
          <ReceiptTotal label="ITEMS" value={items.length} />
          <ReceiptTotal label="FAVOURITES ON LIST" value={favsOnList.length} />
          {list.orderedAt && <ReceiptTotal label="ORDERED" value={stampTime(list.orderedAt)} />}
          {list.deliveredAt && <ReceiptTotal label="DELIVERED" value={stampTime(list.deliveredAt)} />}
          <ReceiptTotal label="NEXT LIST OPENS" value={nextListOpensLabel(list.weekEndDate)} />
        </div>

        {readOnly ? (
          <p role="status" className="notice-locked m-0 mt-4">
            <Lock className="size-[18px] flex-none" aria-hidden />
            <span>
              LOCKED. THIS LIST IS {list.status.toUpperCase()} AND READ-ONLY.
            </span>
          </p>
        ) : (
          <AddItemForm onAdd={(input) => addItem.mutate(input)} />
        )}
      </Receipt>

      <aside className="flex-[1_1_320px] max-w-[420px] flex flex-col gap-7">
        <section aria-labelledby="status-heading">
          <h2 id="status-heading" className="panel-heading mb-3">
            Where it’s at
          </h2>
          <ListProgress list={list} />
          {list.status === 'Draft' && (
            <>
              <button
                type="button"
                className="btn-accent w-full mt-3.5"
                disabled={items.length === 0 || transition.isPending}
                onClick={() => transition.mutate('Ordered')}
              >
                Stamp it ordered
              </button>
              <p className="m-0 mt-2 text-[13px] muted-text">
                {items.length === 0
                  ? 'Add at least one item before you order.'
                  : 'Once stamped, the receipt is locked until it’s delivered.'}
              </p>
            </>
          )}
          {list.status === 'Ordered' && (
            <>
              <button
                type="button"
                className="btn-accent w-full mt-3.5"
                disabled={transition.isPending}
                onClick={() => transition.mutate('Delivered')}
              >
                Stamp it delivered
              </button>
              <p className="m-0 mt-2 text-[13px] muted-text">Do this when the shop arrives.</p>
            </>
          )}
          <CreateListDialog
            trigger={
              <button type="button" className="btn-outline w-full mt-4">
                <Plus className="size-4" aria-hidden />
                New list for another week
              </button>
            }
          />
        </section>

        {readOnly ? (
          <section aria-labelledby="coupons-heading" className="coupon p-4">
            <h2 id="coupons-heading" className="panel-heading text-[22px] mb-1">
              Coupons paused
            </h2>
            <p className="m-0 text-sm muted-text">
              You can’t clip favourites onto a locked receipt. They’ll be back on next week’s list.
            </p>
          </section>
        ) : (
          <section aria-labelledby="coupons-heading">
            <div className="flex justify-between items-baseline gap-3 mb-3">
              <h2 id="coupons-heading" className="panel-heading">
                Clip a favourite
              </h2>
              <Link to="/favourites" className="link-mono">
                MANAGE
              </Link>
            </div>
            {coupons.length === 0 ? (
              <p className="m-0 text-sm muted-text">
                {favs.length === 0
                  ? 'No favourites yet. Star an item, or add some on the Favourites tab.'
                  : 'Every favourite is already on this receipt.'}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {coupons.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="coupon min-h-[76px] p-3 flex flex-col justify-between gap-1.5"
                    onClick={() => reuse.mutate(f.id)}
                    aria-label={`Add ${f.name}`}
                  >
                    <span className="font-bold text-sm leading-tight">{f.name}</span>
                    <span className="mono text-xs font-semibold text-[var(--accent)]">
                      + ADD ×{f.defaultQuantity}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </aside>
    </div>
  )
}
