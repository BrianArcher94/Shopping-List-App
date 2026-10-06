import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import * as repo from '../shared/repository'
import { created, ok, run } from '../shared/http'
import type { ListStatus } from '../../domain/types'

app.http('createList', {
  methods: ['POST'], authLevel: 'anonymous', route: 'lists',
  handler: (req: HttpRequest, ctx: InvocationContext) => run(ctx, async () => {
    const body = (await req.json()) as { weekStartDate: string }
    return created(await repo.createList({ weekStartDate: body.weekStartDate }))
  }),
})

app.http('listAllLists', {
  methods: ['GET'], authLevel: 'anonymous', route: 'lists',
  handler: (req, ctx) => run(ctx, async () => ok(await repo.listAllLists())),
})

app.http('getCurrentList', {
  methods: ['GET'], authLevel: 'anonymous', route: 'lists/current',
  handler: (req, ctx) => run(ctx, async () => {
    const nowParam = req.query.get('now')
    const now = nowParam ? new Date(nowParam) : new Date()
    return ok(await repo.getCurrentList(now))
  }),
})

app.http('getListById', {
  methods: ['GET'], authLevel: 'anonymous', route: 'lists/{id}',
  handler: (req, ctx) => run(ctx, async () => ok(await repo.getListById(req.params.id))),
})

app.http('transitionStatus', {
  methods: ['PATCH'], authLevel: 'anonymous', route: 'lists/{id}/status',
  handler: (req, ctx) => run(ctx, async () => {
    const body = (await req.json()) as { status: ListStatus }
    return ok(await repo.transitionStatus(req.params.id, body.status))
  }),
})