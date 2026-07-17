import type { TableEntity } from '@azure/data-tables'
import type { FavouriteItem, ShoppingItem, ShoppingList } from '../../domain/types'

// ----- ShoppingList -----
export type ListEntity = TableEntity<{
  name: string; weekStartDate: string; weekEndDate: string;
  status: string; createdAt: string; orderedAt: string; deliveredAt: string
}>

export function listToEntity(l: ShoppingList): ListEntity {
  return {
    partitionKey: 'LIST',
    rowKey: l.weekStartDate,
    name: l.name,
    weekStartDate: l.weekStartDate,
    weekEndDate: l.weekEndDate,
    status: l.status,
    createdAt: l.createdAt,
    orderedAt: l.orderedAt ?? '',
    deliveredAt: l.deliveredAt ?? '',
  }
}

export function entityToList(e: ListEntity): ShoppingList {
  return {
    id: e.rowKey,
    name: e.name,
    weekStartDate: e.weekStartDate,
    weekEndDate: e.weekEndDate,
    status: e.status as ShoppingList['status'],
    createdAt: e.createdAt,
    orderedAt: e.orderedAt || null,
    deliveredAt: e.deliveredAt || null,
  }
}

// ----- ShoppingItem -----
export type ItemEntity = TableEntity<{
  name: string; quantity: number; notes: string; createdAt: string
}>

export function itemToEntity(i: ShoppingItem): ItemEntity {
  return {
    partitionKey: i.listId,
    rowKey: i.id,
    name: i.name,
    quantity: i.quantity,
    notes: i.notes ?? '',
    createdAt: i.createdAt,
  }
}

export function entityToItem(e: ItemEntity): ShoppingItem {
  return {
    id: e.rowKey,
    listId: e.partitionKey,
    name: e.name,
    quantity: e.quantity,
    notes: e.notes ?? '',
    createdAt: e.createdAt,
  }
}

// ----- FavouriteItem -----
export type FavEntity = TableEntity<{
  name: string; defaultQuantity: number; createdAt: string
}>

export function normaliseName(name: string): string {
  return name.trim().toLowerCase()
}

export function favToEntity(f: FavouriteItem): FavEntity {
  return {
    partitionKey: 'FAV',
    rowKey: normaliseName(f.name),
    name: f.name,
    defaultQuantity: f.defaultQuantity,
    createdAt: f.createdAt,
  }
}

export function entityToFav(e: FavEntity): FavouriteItem {
  return {
    id: e.rowKey,
    name: e.name,
    defaultQuantity: e.defaultQuantity,
    createdAt: e.createdAt,
  }
}