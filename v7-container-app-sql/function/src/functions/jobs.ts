import { app } from '@azure/functions'
import * as repo from '../shared/repository'
import { ok, run } from '../shared/http'
import { getUpcomingWeekStart } from '../../domain/rules'

// POST /api/jobs/create-weekly-list
// Called by the Logic App every Saturday 20:00. Idempotent: returns 200
// whether it created a new list or found this week's list already present.
app.http('createWeeklyList', {
  methods: ['POST'], authLevel: 'anonymous', route: 'jobs/create-weekly-list',
  handler: (req, ctx) => run(ctx, async () => {
    const weekStartDate = getUpcomingWeekStart(new Date())
    const existing = await repo.getListById(weekStartDate)
    if (existing) {
      return ok({ created: false, weekStartDate, list: existing })
    }
    const list = await repo.createList({ weekStartDate })
    return ok({ created: true, weekStartDate, list })
  }),
})