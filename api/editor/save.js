// POST /api/editor/save -> persist draft overlay (authed). Body = overlay JSON.
import { requireAuth, sendJson, readJsonBody } from '../_lib/auth.js'
import { writeDraft } from '../_lib/blob-store.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })
  if (!requireAuth(req, res)) return
  try {
    const body = await readJsonBody(req)
    const overlay = await writeDraft(body)
    return sendJson(res, 200, { ok: true, overlay })
  } catch (e) {
    return sendJson(res, 500, { error: 'save_failed', message: String(e?.message || e) })
  }
}
