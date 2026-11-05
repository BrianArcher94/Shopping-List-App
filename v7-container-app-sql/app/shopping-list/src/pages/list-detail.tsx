import { useParams, Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { ListWorkspace } from '@/components/list-workspace'
import { useList } from '@/hooks/use-shopping'

export default function ListDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const listQ = useList(id)

  if (listQ.isLoading) return <Skeleton className="h-96 max-w-[540px] mx-auto rounded-none" />
  if (!listQ.data) {
    return (
      <div className="max-w-[540px] mx-auto flex flex-col items-start gap-4">
        <p className="display text-4xl m-0">Receipt not found</p>
        <Link to="/history" className="btn-outline no-underline">
          ← Back to history
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Link to="/history" className="link-mono self-start">
        ← HISTORY
      </Link>
      <ListWorkspace list={listQ.data} />
    </div>
  )
}
