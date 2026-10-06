import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Pencil, Star, Trash2 } from 'lucide-react'
import type { ShoppingItem } from '@/domain/types'

interface ItemRowProps {
  item: ShoppingItem
  readOnly?: boolean
  /** True when an item with this name already exists in the favourites pool. */
  isFavourite?: boolean
  onRemove: (id: string) => void
  onUpdateNotes: (id: string, notes: string) => void
  /**
   * Called when the user clicks the star. The page decides whether to add or
   * remove the favourite based on the current `isFavourite` flag.
   */
  onToggleFavourite?: (item: ShoppingItem, currentlyFavourite: boolean) => void
}

export function ItemRow({
  item,
  readOnly,
  isFavourite = false,
  onRemove,
  onUpdateNotes,
  onToggleFavourite,
}: ItemRowProps) {
  const hasNotes = item.notes.trim().length > 0
  const [open, setOpen] = useState(hasNotes && readOnly)
  const [draft, setDraft] = useState(item.notes)

  function commit() {
    if (draft !== item.notes) onUpdateNotes(item.id, draft)
  }

  return (
    <div className="list-tile flex-col items-stretch">
      <div className="flex items-center justify-between gap-3 w-full">
        <div className="min-w-0">
          <p className="strong-text m-0 truncate">{item.name}</p>
          <p className="muted-text text-[13px] m-0">Qty: {item.quantity}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onToggleFavourite && (
            <button
              type="button"
              className={`btn-icon ${isFavourite ? 'active' : ''}`}
              onClick={() => onToggleFavourite(item, isFavourite)}
              aria-label={isFavourite ? `Remove ${item.name} from favourites` : `Add ${item.name} to favourites`}
              aria-pressed={isFavourite}
            >
              <Star className="size-4" fill={isFavourite ? 'currentColor' : 'none'} />
            </button>
          )}
          <button
            type="button"
            className={`btn-icon ${hasNotes ? 'active' : ''}`}
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? `Hide notes for ${item.name}` : `Show notes for ${item.name}`}
            aria-expanded={open}
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            className="btn-icon danger"
            disabled={readOnly}
            onClick={() => onRemove(item.id)}
            aria-label={`Remove ${item.name}`}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {open && (
        <div className="pt-3">
          {readOnly ? (
            hasNotes ? (
              <p className="text-sm whitespace-pre-wrap muted-text border-l-2 border-[var(--primary-strong)] pl-3 m-0">
                {item.notes}
              </p>
            ) : (
              <p className="text-sm italic muted-text m-0">No notes.</p>
            )
          ) : (
            <Textarea
              aria-label={`Notes for ${item.name}`}
              placeholder="Add a note — brand, store aisle, prep instructions…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              rows={2}
              className="resize-y bg-[var(--tile-bg)] border-[var(--border-ink)] text-[var(--ink)]"
            />
          )}
        </div>
      )}
    </div>
  )
}
