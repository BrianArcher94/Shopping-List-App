import { app } from '@azure/functions'
import * as repo from '../shared/repository'
import { created, noContent, ok, run } from '../shared/http'

app.http('listFavourites', {
  methods: ['GET'], authLevel: 'anonymous', route: 'favourites',
  handler: (req, ctx) => run(ctx, async () => ok(await repo.listFavourites())),
})

app.http('addFavourite', {
  methods: ['POST'], authLevel: 'anonymous', route: 'favourites',
  handler: (req, ctx) => run(ctx, async () => {
    const body = (await req.json()) as { name: string; defaultQuantity: number }
    return created(await repo.addFavourite(body))
  }),
})

app.http('removeFavourite', {
  methods: ['DELETE'], authLevel: 'anonymous', route: 'favourites/{id}',
  handler: (req, ctx) => run(ctx, async () => {
    await repo.removeFavourite(req.params.id)
    return noContent()
  }),
})