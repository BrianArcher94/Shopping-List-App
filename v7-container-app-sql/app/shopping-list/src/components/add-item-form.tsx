import { useState, type FormEvent } from 'react'

interface AddItemFormProps {
  onAdd: (input: { name: string; quantity: number; notes: string }) => void
  disabled?: boolean
}

/** The "+ ADD AN ITEM" line at the foot of a Draft receipt. */
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

  return (
    <form onSubmit={handleSubmit} className="pt-4 flex flex-col gap-2">
      <div className="flex gap-2 flex-wrap">
        <label htmlFor="item-name" className="sr-only">
          Item name
        </label>
        <input
          id="item-name"
          type="text"
          placeholder="+ ADD AN ITEM"
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={disabled}
          required
          className="field flex-[1_1_200px]"
        />
        <label htmlFor="item-qty" className="sr-only">
          Quantity
        </label>
        <input
          id="item-qty"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
          disabled={disabled}
          required
          className="field w-[76px]"
        />
        <button type="submit" disabled={disabled || !name.trim()} className="btn-solid h-12" aria-label="Add item">
          ADD
        </button>
      </div>

      {!showNotes ? (
        <button
          type="button"
          onClick={() => setShowNotes(true)}
          disabled={disabled}
          className="self-start min-h-11 px-0 bg-transparent border-0 link-mono cursor-pointer"
        >
          + ADD A NOTE
        </button>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="item-notes" className="field-label">
              Note
            </label>
            <button
              type="button"
              onClick={() => {
                setNotes('')
                setShowNotes(false)
              }}
              className="min-h-11 bg-transparent border-0 link-mono cursor-pointer"
            >
              DISCARD NOTE
            </button>
          </div>
          <textarea
            id="item-notes"
            aria-label="Notes for new item"
            placeholder="Brand, size, aisle…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={disabled}
            rows={2}
            className="field"
          />
        </div>
      )}
    </form>
  )
}
