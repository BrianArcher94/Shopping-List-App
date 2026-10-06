import { app, type HttpRequest, type InvocationContext } from '@azure/functions'
import { PHOTO_MAX_UPLOAD_BYTES } from '../../domain/profile'
import { ApiError, noContent, ok, runAuthed } from '../shared/http'
import { profileServiceFor } from '../shared/profile-service'

// V4 profile routes. Everything under /me acts on the caller's own account: the
// user is the oid in the validated bearer token, never a path or body value.

const svc = (ctx: InvocationContext) => profileServiceFor((m) => ctx.warn(m))

async function readJson(req: HttpRequest): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON')
  }
}

app.http('getMe', {
  methods: ['GET'], authLevel: 'anonymous', route: 'me',
  handler: (req, ctx) => runAuthed(req, ctx, async (user) => ok(await svc(ctx).getMe(user))),
})

// Details are written to the Entra user (Graph) - nothing is stored in SQL.
app.http('updateMe', {
  methods: ['PATCH'], authLevel: 'anonymous', route: 'me',
  handler: (req, ctx) => runAuthed(req, ctx, async (user) =>
    ok(await svc(ctx).updateDetails(user, await readJson(req)))),
})

// Body: { "confirm": "DELETE" } - a second, server-side guard behind the UI's.
app.http('deleteMe', {
  methods: ['DELETE'], authLevel: 'anonymous', route: 'me',
  handler: (req, ctx) => runAuthed(req, ctx, async (user) => {
    await svc(ctx).deleteAccount(user, await readJson(req))
    ctx.log(`Account deleted oid=${user.oid}`)
    return noContent()
  }),
})

app.http('setMyPreferences', {
  methods: ['PUT'], authLevel: 'anonymous', route: 'me/preferences',
  handler: (req, ctx) => runAuthed(req, ctx, async (user) =>
    ok({ theme: await svc(ctx).setTheme(user, await readJson(req)) })),
})

app.http('getMyActivity', {
  methods: ['GET'], authLevel: 'anonymous', route: 'me/activity',
  handler: (req, ctx) => runAuthed(req, ctx, async (user) => ok(await svc(ctx).getActivity(user))),
})

app.http('exportMyData', {
  methods: ['GET'], authLevel: 'anonymous', route: 'me/export',
  handler: (req, ctx) => runAuthed(req, ctx, async (user) => ({
    status: 200,
    jsonBody: await svc(ctx).exportData(user),
    headers: {
      'Content-Disposition': 'attachment; filename="shopping-list-my-data.json"',
      'Cache-Control': 'no-store',
    },
  })),
})

app.http('getMyPhoto', {
  methods: ['GET'], authLevel: 'anonymous', route: 'me/photo',
  handler: (req, ctx) => runAuthed(req, ctx, async (user) => {
    const photo = await svc(ctx).getPhoto(user)
    if (!photo) return { status: 404, jsonBody: { error: 'No photo' } }
    return {
      status: 200,
      body: photo.bytes,
      headers: {
        'Content-Type': 'image/jpeg',
        // private: it is behind a bearer token and must never sit in a shared cache.
        'Cache-Control': 'private, max-age=300',
        ETag: photo.etag,
        'X-Content-Type-Options': 'nosniff',
      },
    }
  }),
})

// Body: the cropped JPEG itself (Content-Type: image/jpeg), not JSON.
app.http('putMyPhoto', {
  methods: ['PUT'], authLevel: 'anonymous', route: 'me/photo',
  handler: (req, ctx) => runAuthed(req, ctx, async (user) => {
    // Refuse an oversized body before buffering it.
    const declared = Number(req.headers.get('content-length') ?? 0)
    if (declared > PHOTO_MAX_UPLOAD_BYTES) throw new ApiError(413, 'Photo is too large')
    const bytes = new Uint8Array(await req.arrayBuffer())
    return ok(await svc(ctx).uploadPhoto(user, req.headers.get('content-type'), bytes))
  }),
})

app.http('deleteMyPhoto', {
  methods: ['DELETE'], authLevel: 'anonymous', route: 'me/photo',
  handler: (req, ctx) => runAuthed(req, ctx, async (user) => ok(await svc(ctx).removePhoto(user))),
})

// Revokes every session on every device - including the caller's own.
app.http('revokeMySessions', {
  methods: ['POST'], authLevel: 'anonymous', route: 'me/revoke-sessions',
  handler: (req, ctx) => runAuthed(req, ctx, async (user) => {
    await svc(ctx).revokeSessions(user)
    return noContent()
  }),
})
