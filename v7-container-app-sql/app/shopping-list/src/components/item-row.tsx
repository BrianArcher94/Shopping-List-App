import { useState } from 'react'
import { Pencil, Star, X } from 'lucide-react'
import type { ShoppingItem } from '@/domain/types'

interface ItemRowProps {
  item: ShoppingItem
  readOnly?: boolean
  /** True when an item with this name already exists in the favourites pool. */
  isFavourite?: boolean
  onRemove?: (id: string) => void
  onUpdateNotes?: (id: string, notes: string) => void
  /**
   * Called when the user clicks the star. The page decides whether to add or
   * remove the favourite based on the current `isFavourite` flag.
   */
  onToggleFavourite?: (item: ShoppingItem, currentlyFavourite: boolean) => void
}

/** One receipt line: "2 x SEMI-SKIMMED MILK", with its note indented underneath. */
export function ItemRow({
  item,
  readOnly,
  isFavourite = false,
  onRemove,
  onUpdateNotes,
  onToggleFavourite,
}: ItemRowProps) {
  const hasNotes = item.notes.trim().length > 0
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(item.notes)
  const editable = !readOnly

  function commit() {
    if (draft !== item.notes) onUpdateNotes?.(item.id, draft)
  }

  return (
    <li className="py-1.5">
      <div className="flex items-center gap-2.5 min-h-11">
        <span className="w-10 flex-none font-semibold">{item.quantity} x</span>
        <span className="flex-1 min-w-0 font-semibold uppercase break-words">{item.name}</span>
        {onToggleFavourite && (
          <button
            type="button"
            className={`btn-icon ${isFavourite ? 'is-on' : ''}`}
            onClick={() => onToggleFavourite(item, isFavourite)}
            aria-label={isFavourite ? `Remove ${item.name} from favourites` : `Add ${item.name} to favourites`}
            aria-pressed={isFavourite}
          >
            <Star className="size-4" fill={isFavourite ? 'currentColor' : 'none'} />
          </button>
        )}
        {editable && onUpdateNotes && (
          <button
            type="button"
            className={`btn-icon ${hasNotes ? 'is-on' : ''}`}
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? `Hide notes for ${item.name}` : `Show notes for ${item.name}`}
            aria-expanded={open}
          >
            <Pencil className="size-4" />
          </button>
        )}
        {editable && onRemove && (
          <button
            type="button"
            className="btn-icon"
            onClick={() => onRemove(item.id)}
            aria-label={`Remove ${item.name}`}
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {open && editable ? (
        <div className="pl-12 pt-1 pb-2">
          <textarea
            className="field w-full text-sm"
            aria-label={`Notes for ${item.name}`}
            placeholder="Brand, size, aisle…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            rows={2}
          />
        </div>
      ) : (
        hasNotes && (
          <p className="m-0 pl-12 text-[13px] muted-text whitespace-pre-wrap">
            <span aria-hidden>&gt; </span>
            <span>{item.notes}</span>
          </p>
        )
      )}
    </li>
  )
}
