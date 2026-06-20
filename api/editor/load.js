// GET /api/editor/load -> current draft overlay (authed)
import { requireAuth, sendJson } from '../_lib/auth.js'
import { getDraft } from '../_lib/blob-store.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'method_not_allowed' })
  if (!requireAuth(req, res)) return
  try {
    const overlay = await getDraft()
    return sendJson(res, 200, { overlay })
  } catch (e) {
    return sendJson(res, 500, { error: 'load_failed', message: String(e?.message || e) })
  }
}
