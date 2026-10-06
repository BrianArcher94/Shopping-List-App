import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/status-badge'
import { useListHistory } from '@/hooks/use-shopping'
import { getCurrentWeekStart } from '@/domain/rules'

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default function HistoryPage() {
  const q = useListHistory()

  if (q.isLoading) return <Skeleton className="h-48 rounded-2xl" />
  // History shows only weeks that have already passed — exclude the current week
  // (shown on the Current tab) and any future-dated lists.
  const currentWeekStart = getCurrentWeekStart(new Date())
  const lists = (q.data ?? []).filter((l) => l.weekStartDate.slice(0, 10) < currentWeekStart)

  return (
    <div className="card-styled">
      <header className="mb-4">
        <p className="eyebrow">History</p>
        <h2 className="text-xl font-bold m-0">Previous lists</h2>
      </header>
      <div className="flex flex-col gap-2.5">
        {lists.length === 0 ? (
          <p className="muted-text text-center py-6 m-0">No lists yet.</p>
        ) : (
          lists.map((l) => (
            <Link key={l.id} to={`/list/${l.id}`} className="list-tile no-underline">
              <div>
                <p className="strong-text m-0">
                  Week of {format(parseIsoDate(l.weekStartDate), 'EEE d MMM')}
                </p>
                <p className="muted-text text-[13px] m-0">
                  {l.weekStartDate} → {l.weekEndDate}
                </p>
              </div>
              <StatusBadge status={l.status} />
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
