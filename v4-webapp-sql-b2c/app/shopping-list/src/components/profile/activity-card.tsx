import { useId } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { useProfileActivity } from '@/hooks/use-profile'
import type { ProfileActivityEntry } from '@/domain/profile'

const DOT: Record<ProfileActivityEntry['kind'], string> = {
  item: 'var(--primary-ink)',
  favourite: 'var(--chart-5)',
  status: 'var(--status-delivered)',
}

function describe(e: ProfileActivityEntry): string {
  switch (e.kind) {
    case 'item':
      return `Added ${e.label}${e.quantity && e.quantity > 1 ? ` ×${e.quantity}` : ''}`
    case 'favourite':
      return `Saved ${e.label} as a favourite`
    case 'status':
      return `Marked a list ${e.label}`
  }
}

/** "Your contributions" - from the V4 audit columns, so only API mode has data. */
export function ActivityCard() {
  const id = useId()
  const q = useProfileActivity()

  return (
    <section className="card-styled" aria-labelledby={`${id}-h`}>
      <header className="flex items-start justify-between gap-3 mb-3.5">
        <div>
          <p className="eyebrow">Activity</p>
          <h3 id={`${id}-h`} className="text-xl font-bold m-0">Your contributions</h3>
        </div>
        {q.data && <span className="tag tag--local">Last <span className="num">{q.data.windowDays}</span> days</span>}
      </header>

      {q.isLoading && <Skeleton className="h-32 rounded-xl" />}
      {q.isError && <p className="muted-text text-sm m-0">Couldn’t load your activity.</p>}

      {q.data && (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Stat value={q.data.itemsAdded} label="Items added" />
            <Stat value={q.data.statusChanges} label="Status changes" />
            <Stat value={q.data.favouritesAdded} label="Favourites" />
          </div>

          {q.data.recent.length === 0 ? (
            <p className="muted-text text-sm m-0">Nothing yet — items you add will show up here.</p>
          ) : (
            <ul className="list-none m-0 p-0 flex flex-col gap-3">
              {q.data.recent.map((e, i) => (
                <li key={`${e.kind}-${e.at}-${i}`} className="flex gap-2.5 items-start">
                  <span className="size-2 rounded-full shrink-0 mt-[7px]" style={{ background: DOT[e.kind] }} aria-hidden />
                  <div className="min-w-0">
                    <p className="m-0 text-sm font-semibold truncate">{describe(e)}</p>
                    <p className="m-0 text-xs muted-text num">
                      {e.listName ? `${e.listName} · ` : ''}
                      {format(new Date(e.at), 'EEE d MMM, HH:mm')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Link to="/history" className="inline-block mt-3.5 text-sm font-semibold muted-text hover:text-[var(--ink)]">
            View all in History →
          </Link>
        </>
      )}
    </section>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="stat-tile">
      <b className="num text-2xl leading-tight">{value}</b>
      <span className="muted-text text-[12.5px]">{label}</span>
    </div>
  )
}
