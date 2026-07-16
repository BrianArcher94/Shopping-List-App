import { Link } from 'react-router-dom'
import { format, formatDistanceToNow } from 'date-fns'
import { CalendarRange, ChevronRight, History } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/status-badge'
import { useListHistory } from '@/hooks/use-shopping'
import { getCurrentWeekStart } from '@/domain/rules'

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

function PageSkeleton() {
  return (
    <div className="card-styled space-y-4">
      <Skeleton className="h-8 w-48 rounded-lg" />
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-16 rounded-xl" />
    </div>
  )
}

export default function HistoryPage() {
  const q = useListHistory()

  if (q.isLoading) return <PageSkeleton />
  // History shows only weeks that have already passed — exclude the current week
  // (shown on the Current tab) and any future-dated lists.
  const currentWeekStart = getCurrentWeekStart(new Date())
  const lists = (q.data ?? []).filter((l) => l.weekStartDate.slice(0, 10) < currentWeekStart)

  return (
    <div className="card-styled rise-in">
      <header className="flex items-center justify-between gap-4 mb-4">
        <div>
          <p className="eyebrow">History</p>
          <h2 className="text-2xl font-extrabold m-0 text-gradient">Previous lists</h2>
        </div>
        {lists.length > 0 && (
          <span className="chip">
            {lists.length} {lists.length === 1 ? 'week' : 'weeks'}
          </span>
        )}
      </header>
      <div className="flex flex-col gap-2.5">
        {lists.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="empty-hero-icon">
              <History className="size-6" />
            </span>
            <p className="muted-text m-0">No lists yet.</p>
            <p className="muted-text text-sm m-0">
              Finished weeks will show up here once the current one wraps up.
            </p>
          </div>
        ) : (
          lists.map((l, index) => (
            <Link
              key={l.id}
              to={`/list/${l.id}`}
              className="list-tile no-underline group rise-in"
              style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="empty-hero-icon !w-10 !h-10 shrink-0">
                  <CalendarRange className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="strong-text m-0 truncate">
                    Week of {format(parseIsoDate(l.weekStartDate), 'EEE d MMM')}
                    <span className="muted-text font-medium">
                      {' · '}
                      {formatDistanceToNow(parseIsoDate(l.weekStartDate), { addSuffix: true })}
                    </span>
                  </p>
                  <p className="muted-text text-[13px] m-0">
                    {l.weekStartDate} → {l.weekEndDate}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={l.status} />
                <ChevronRight className="size-4 text-[var(--muted-ink)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--ink)]" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
