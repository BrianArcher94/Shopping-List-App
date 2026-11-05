import { app } from '@azure/functions'
import * as repo from '../shared/repository'
import { created, noContent, ok, run } from '../shared/http'

app.http('listItems', {
  methods: ['GET'], authLevel: 'anonymous', route: 'lists/{listId}/items',
  handler: (req, ctx) => run(ctx, async () => ok(await repo.listItems(req.params.listId))),
})

app.http('addItem', {
  methods: ['POST'], authLevel: 'anonymous', route: 'lists/{listId}/items',
  handler: (req, ctx) => run(ctx, async () => {
    const body = (await req.json()) as { name: string; quantity: number; notes?: string }
    return created(await repo.addItem(req.params.listId, body))
  }),
})

app.http('reuseFavourite', {
  methods: ['POST'], authLevel: 'anonymous', route: 'lists/{listId}/items/from-favourite',
  handler: (req, ctx) => run(ctx, async () => {
    const body = (await req.json()) as { favouriteId: string }
    return created(await repo.reuseFavourite(req.params.listId, body.favouriteId))
  }),
})

app.http('removeItem', {
  methods: ['DELETE'], authLevel: 'anonymous', route: 'items/{itemId}',
  handler: (req, ctx) => run(ctx, async () => {
    await repo.removeItem(req.params.itemId)
    return noContent()
  }),
})

app.http('updateItemNotes', {
  methods: ['PATCH'], authLevel: 'anonymous', route: 'items/{itemId}',
  handler: (req, ctx) => run(ctx, async () => {
    const body = (await req.json()) as { notes: string }
    return ok(await repo.updateItemNotes(req.params.itemId, body.notes))
  }),
})