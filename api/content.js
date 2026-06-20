// GET /api/content        -> published (live) overlay for visitors
// GET /api/content?draft=1 -> draft overlay, but ONLY for an authed editor
// Public, sanitized, and short-cached. This is what the runtime loader reads.
import { isAuthed, sendJson } from './_lib/auth.js'
import { getLive, getDraft } from './_lib/blob-store.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'method_not_allowed' })
  try {
    const wantsDraft = /[?&]draft=1(?:&|$)/.test(req.url || '')
    if (wantsDraft) {
      if (!isAuthed(req)) return sendJson(res, 401, { error: 'unauthorized' })
      const overlay = await getDraft()
      return sendJson(res, 200, { overlay })
    }
    const overlay = await getLive()
    // Visitors: allow a short CDN cache, refresh in the background.
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=300')
    return res.end(JSON.stringify({ overlay }))
  } catch (e) {
    return sendJson(res, 500, { error: 'content_failed', message: String(e?.message || e) })
  }
}
