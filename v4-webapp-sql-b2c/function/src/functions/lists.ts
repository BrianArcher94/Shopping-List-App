import { app, type HttpRequest, type InvocationContext } from '@azure/functions'
import * as repo from '../shared/repository'
import { created, ok, runAuthed } from '../shared/http'
import type { ListStatus } from '../../domain/types'

// authLevel stays 'anonymous': that setting governs Functions host KEYS. The
// gate on these routes is the bearer-token check inside runAuthed.

app.http('createList', {
  methods: ['POST'], authLevel: 'anonymous', route: 'lists',
  handler: (req: HttpRequest, ctx: InvocationContext) => runAuthed(req, ctx, async (user) => {
    const body = (await req.json()) as { weekStartDate: string }
    return created(await repo.createList({ weekStartDate: body.weekStartDate }, user))
  }),
})

app.http('listAllLists', {
  methods: ['GET'], authLevel: 'anonymous', route: 'lists',
  handler: (req, ctx) => runAuthed(req, ctx, async () => ok(await repo.listAllLists())),
})

app.http('getCurrentList', {
  methods: ['GET'], authLevel: 'anonymous', route: 'lists/current',
  handler: (req, ctx) => runAuthed(req, ctx, async () => {
    const nowParam = req.query.get('now')
    const now = nowParam ? new Date(nowParam) : new Date()
    return ok(await repo.getCurrentList(now))
  }),
})

app.http('getListById', {
  methods: ['GET'], authLevel: 'anonymous', route: 'lists/{id}',
  handler: (req, ctx) => runAuthed(req, ctx, async () => ok(await repo.getListById(req.params.id))),
})

app.http('transitionStatus', {
  methods: ['PATCH'], authLevel: 'anonymous', route: 'lists/{id}/status',
  handler: (req, ctx) => runAuthed(req, ctx, async (user) => {
    const body = (await req.json()) as { status: ListStatus }
    return ok(await repo.transitionStatus(req.params.id, body.status, user))
  }),
})
