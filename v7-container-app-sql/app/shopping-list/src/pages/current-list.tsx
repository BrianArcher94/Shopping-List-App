import { Plus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Receipt } from '@/components/receipt'
import { ListWorkspace } from '@/components/list-workspace'
import { CreateListDialog } from '@/components/create-list-dialog'
import { useCurrentList, useCreateThisWeekList } from '@/hooks/use-shopping'

export default function CurrentListPage() {
  const currentQ = useCurrentList()

  if (currentQ.isLoading) return <Skeleton className="h-96 max-w-[540px] mx-auto rounded-none" />

  if (!currentQ.data) return <EmptyState />

  return <ListWorkspace list={currentQ.data} />
}

function EmptyState() {
  const create = useCreateThisWeekList()
  return (
    <Receipt className="max-w-[540px] mx-auto" labelledBy="empty-title">
      <div className="text-center flex flex-col items-center gap-3 py-4">
        <span className="text-xs muted-text">SHOPPING LIST · THIS WEEK</span>
        <h1 id="empty-title" className="display m-0 text-[44px]">
          No receipt yet
        </h1>
        <p className="m-0 max-w-sm muted-text font-sans text-[15px]">
          This week’s list is normally opened automatically on Saturday at 20:00. Start it now,
          or open a list for another Sunday.
        </p>
        <div className="flex gap-2 flex-wrap justify-center pt-3">
          <button
            type="button"
            className="btn-accent text-xl px-6"
            onClick={() => create.mutate()}
            disabled={create.isPending}
          >
            Start this week’s list
          </button>
          <CreateListDialog
            trigger={
              <button type="button" className="btn-outline min-h-14">
                <Plus className="size-4" aria-hidden />
                New list
              </button>
            }
          />
        </div>
      </div>
    </Receipt>
  )
}
