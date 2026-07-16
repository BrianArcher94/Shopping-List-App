import { useState, type FormEvent } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Pencil, Plus, X } from 'lucide-react'

interface AddItemFormProps {
  onAdd: (input: { name: string; quantity: number; notes: string }) => void
  disabled?: boolean
}

export function AddItemForm({ onAdd, disabled }: AddItemFormProps) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)

  function reset() {
    setName('')
    setQuantity(1)
    setNotes('')
    setShowNotes(false)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd({ name: trimmed, quantity, notes: notes.trim() })
    reset()
  }

  const inputCls =
    'px-3 py-[10px] rounded-[10px] border border-[var(--border-ink)] bg-[var(--tile-bg)] text-[var(--ink)] disabled:opacity-50 focus-visible:outline-none focus-visible:border-[var(--primary-strong)]'

  return (
    <form onSubmit={handleSubmit} className="space-y-2 mb-3">
      <div className="grid gap-2 items-end" style={{ gridTemplateColumns: '1.5fr 0.5fr auto' }}>
        <div className="flex flex-col gap-1">
          <label htmlFor="item-name" className="text-[12px] muted-text">
            Item
          </label>
          <input
            id="item-name"
            type="text"
            aria-label="Item name"
            placeholder="e.g. Milk"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled}
            required
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="item-qty" className="text-[12px] muted-text">
            Qty
          </label>
          <input
            id="item-qty"
            type="number"
            aria-label="Quantity"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            disabled={disabled}
            required
            className={inputCls}
          />
        </div>
        <button
          type="submit"
          disabled={disabled || !name.trim()}
          className="btn-cyan inline-flex items-center gap-1.5"
        >
          <Plus className="size-4" />
          Add item
        </button>
      </div>

      {!showNotes ? (
        <button
          type="button"
          onClick={() => setShowNotes(true)}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--primary-ink)] hover:underline disabled:opacity-50"
        >
          <Pencil className="size-3.5" />
          Add notes
        </button>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="item-notes" className="text-[12px] muted-text">
              Notes
            </label>
            <button
              type="button"
              onClick={() => {
                setNotes('')
                setShowNotes(false)
              }}
              className="text-[12px] muted-text hover:text-[var(--ink)] inline-flex items-center gap-1"
              aria-label="Discard notes"
            >
              <X className="size-3" />
              discard
            </button>
          </div>
          <Textarea
            id="item-notes"
            aria-label="Notes for new item"
            placeholder="Brand, store aisle, prep instructions…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={disabled}
            rows={2}
            className="resize-y bg-[var(--tile-bg)] border-[var(--border-ink)] text-[var(--ink)]"
          />
        </div>
      )}
    </form>
  )
}
