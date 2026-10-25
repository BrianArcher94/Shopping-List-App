import type { ReactNode } from 'react'

interface ReceiptProps {
  children: ReactNode
  labelledBy?: string
  className?: string
}

/** A till receipt: perforated top and bottom edges around a mono paper body. */
export function Receipt({ children, labelledBy, className = '' }: ReceiptProps) {
  return (
    <article className={`receipt ${className}`} aria-labelledby={labelledBy}>
      <div aria-hidden className="receipt__edge receipt__edge--top" />
      <div className="receipt__body">{children}</div>
      <div aria-hidden className="receipt__edge receipt__edge--bottom" />
    </article>
  )
}

interface ReceiptHeaderProps {
  id?: string
  eyebrow: string
  title: string
  subtitle?: string
  /** Rubber stamp pressed onto the header's dashed rule (e.g. the list status). */
  stamp?: ReactNode
}

export function ReceiptHeader({ id, eyebrow, title, subtitle, stamp }: ReceiptHeaderProps) {
  return (
    <div className="rule relative text-center flex flex-col gap-1 pb-4">
      <span className="text-xs muted-text">{eyebrow}</span>
      <h1 id={id} className="display m-0 text-[34px] sm:text-[56px]">
        {title}
      </h1>
      {subtitle && <span className="text-xs muted-text">{subtitle}</span>}
      {stamp}
    </div>
  )
}

/** A two-column total line at the foot of a receipt. */
export function ReceiptTotal({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  )
}
