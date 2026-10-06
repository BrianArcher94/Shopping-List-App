import { app } from '@azure/functions'
import * as repo from '../shared/repository'
import { ok, run } from '../shared/http'
import { SYSTEM_PRINCIPAL } from '../shared/auth'
import { getUpcomingWeekStart } from '../../domain/rules'

// POST /api/jobs/create-weekly-list
// Called by the Logic App every Saturday 20:00. Idempotent: returns 200
// whether it created a new list or found this week's list already present.
//
// V4: this is the one route NOT behind a user token — the scheduler has no
// user. authLevel 'function' means the Functions host requires a host/function
// key (x-functions-key), which Terraform writes to Key Vault and the Logic App
// reads via a Key Vault reference. Rows it creates are stamped 'system'.
app.http('createWeeklyList', {
  methods: ['POST'], authLevel: 'function', route: 'jobs/create-weekly-list',
  handler: (req, ctx) => run(ctx, async () => {
    const weekStartDate = getUpcomingWeekStart(new Date())
    const existing = await repo.getListById(weekStartDate)
    if (existing) {
      return ok({ created: false, weekStartDate, list: existing })
    }
    const list = await repo.createList({ weekStartDate }, SYSTEM_PRINCIPAL)
    return ok({ created: true, weekStartDate, list })
  }),
})
