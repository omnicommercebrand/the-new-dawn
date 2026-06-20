// GET  /api/editor/versions                 -> list snapshots (authed)
// POST /api/editor/versions { pathname }     -> restore snapshot into draft (authed)
import { requireAuth, sendJson, readJsonBody } from '../_lib/auth.js'
import { listVersions, restoreVersionToDraft } from '../_lib/blob-store.js'

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return
  try {
    if (req.method === 'GET') {
      const versions = await listVersions()
      return sendJson(res, 200, { versions })
    }
    if (req.method === 'POST') {
      const body = await readJsonBody(req)
      const pathname = typeof body?.pathname === 'string' ? body.pathname : ''
      const overlay = await restoreVersionToDraft(pathname)
      if (!overlay) return sendJson(res, 400, { error: 'invalid_version' })
      return sendJson(res, 200, { ok: true, overlay })
    }
    return sendJson(res, 405, { error: 'method_not_allowed' })
  } catch (e) {
    return sendJson(res, 500, { error: 'versions_failed', message: String(e?.message || e) })
  }
}
