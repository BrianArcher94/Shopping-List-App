import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { shoppingDataService } from '@/data'
import { getCurrentWeekStart } from '@/domain/rules'
import type { ListStatus } from '@/domain/types'
import { toast } from 'sonner'

// ----- query keys ------------------------------------------------------------
export const qk = {
  all: ['shopping'] as const,
  lists: () => [...qk.all, 'lists'] as const,
  list: (id: string) => [...qk.all, 'list', id] as const,
  current: () => [...qk.all, 'current'] as const,
  items: (listId: string) => [...qk.all, 'items', listId] as const,
  favourites: () => [...qk.all, 'favourites'] as const,
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: qk.all })
}

// ----- queries ---------------------------------------------------------------
export function useCurrentList() {
  return useQuery({
    queryKey: qk.current(),
    queryFn: () => shoppingDataService.getCurrentList(new Date()),
  })
}

export function useListHistory() {
  return useQuery({
    queryKey: qk.lists(),
    queryFn: () => shoppingDataService.listAllLists(),
  })
}

export function useList(id: string | undefined) {
  return useQuery({
    queryKey: qk.list(id ?? '_'),
    enabled: Boolean(id),
    queryFn: () => shoppingDataService.getListById(id as string),
  })
}

export function useListItems(listId: string | undefined) {
  return useQuery({
    queryKey: qk.items(listId ?? '_'),
    enabled: Boolean(listId),
    queryFn: () => shoppingDataService.listItems(listId as string),
  })
}

export function useFavourites() {
  return useQuery({
    queryKey: qk.favourites(),
    queryFn: () => shoppingDataService.listFavourites(),
  })
}

// ----- mutations -------------------------------------------------------------
export function useAddItem(listId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; quantity: number; notes?: string }) =>
      shoppingDataService.addItem(listId, input),
    onSuccess: () => invalidateAll(qc),
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useRemoveItem(listId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => shoppingDataService.removeItem(itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.items(listId) }),
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateItemNotes(listId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, notes }: { itemId: string; notes: string }) =>
      shoppingDataService.updateItemNotes(itemId, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.items(listId) }),
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useTransitionStatus(listId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (next: ListStatus) => shoppingDataService.transitionStatus(listId, next),
    onSuccess: (l) => {
      toast.success(`List moved to ${l.status}`)
      void invalidateAll(qc)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useAddFavourite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; defaultQuantity: number }) =>
      shoppingDataService.addFavourite(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.favourites() }),
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useRemoveFavourite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => shoppingDataService.removeFavourite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.favourites() }),
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useReuseFavourite(listId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (favouriteId: string) => shoppingDataService.reuseFavourite(listId, favouriteId),
    onSuccess: () => {
      toast.success('Added to list')
      return qc.invalidateQueries({ queryKey: qk.items(listId) })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useCreateThisWeekList() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      shoppingDataService.createList({ weekStartDate: getCurrentWeekStart(new Date()) }),
    onSuccess: () => {
      toast.success('Started this week’s list')
      void invalidateAll(qc)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useCreateList() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (weekStartDate: string) => shoppingDataService.createList({ weekStartDate }),
    onSuccess: (list) => {
      toast.success(`Created ${list.name}`)
      void invalidateAll(qc)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
