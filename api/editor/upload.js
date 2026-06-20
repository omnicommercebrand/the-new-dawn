// POST /api/editor/upload
// Client-direct upload handshake for @vercel/blob/client `upload()`.
// The browser streams the file straight to Blob storage (bypassing the
// 4.5 MB function body limit). This route only mints a short-lived,
// constrained token — and only for an authenticated editor.
//
// Two body types arrive here:
//   1. blob.generate-client-token  (from the browser; carries our cookie)
//   2. blob.upload-completed       (server->server callback; signed)
// handleUpload verifies the callback signature; we gate (1) on our cookie.
import { handleUpload } from '@vercel/blob/client'
import { isAuthed, sendJson, readJsonBody } from '../_lib/auth.js'

const MAX_BYTES = 15 * 1024 * 1024 // 15 MB
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif']

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })
  try {
    const body = await readJsonBody(req)
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        // Runs only for the browser-initiated token request.
        if (!isAuthed(req)) throw new Error('Not authorized')
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
        }
      },
      onUploadCompleted: async () => {
        // No-op: the browser already receives the blob URL from upload().
        // (This callback only fires on deployed HTTPS, never on localhost.)
      },
    })
    return sendJson(res, 200, json)
  } catch (e) {
    const message = String(e?.message || e)
    return sendJson(res, message === 'Not authorized' ? 401 : 400, { error: message })
  }
}
