// ============================================================
// A NEW DAWN — Local dev server (verification only)
// Serves the static site + a faithful, file-backed implementation
// of the /api/* routes so the editor can be exercised end-to-end
// WITHOUT Vercel or a Blob token. It reuses the SAME pure modules
// (overlay-core, palettes) and the SAME auth library the deployed
// functions use, so behavior matches production for everything
// except real Blob image upload (which is HTTPS/deploy-only).
//
//   EDITOR_PASSWORD=dawn node scripts/dev-server.js
//   -> http://localhost:8787/editor
// ============================================================

import http from 'node:http'
import { readFile, writeFile, mkdir, readdir, stat, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { sanitizeOverlay, emptyOverlay } from '../js/overlay-core.js'
import { requireAuth, isAuthed, sendJson, readJsonBody, checkPassword, makeToken } from '../api/_lib/auth.js'

// Dev cookie helpers: identical token + name to production, but WITHOUT the
// Secure flag so the browser keeps it over plain http://localhost. The
// deployed functions use the real Secure cookie from api/_lib/auth.js.
const DEV_MAX_AGE = 60 * 60 * 24 * 14
const devAuthCookie = (t) => `nd_editor_auth=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${DEV_MAX_AGE}`
const devClearCookie = () => `nd_editor_auth=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const STORE = path.join(__dirname, '.dev-store')
const VERSIONS = path.join(STORE, 'versions')
const PORT = process.env.PORT || 8787
const MAX_VERSIONS = 30

if (!process.env.EDITOR_PASSWORD) {
  process.env.EDITOR_PASSWORD = 'dawn'
  console.log('[dev] EDITOR_PASSWORD not set — using "dawn" for local testing')
}

// ---- File-backed overlay store (mirrors api/_lib/blob-store.js) ----------
async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return null
  }
}
async function getLive() {
  return sanitizeOverlay((await readJson(path.join(STORE, 'live.json'))) || emptyOverlay())
}
async function getDraft() {
  const d = await readJson(path.join(STORE, 'draft.json'))
  return d ? sanitizeOverlay(d) : getLive()
}
async function writeDraft(raw) {
  const clean = sanitizeOverlay(raw)
  await mkdir(STORE, { recursive: true })
  await writeFile(path.join(STORE, 'draft.json'), JSON.stringify(clean, null, 2))
  return clean
}
async function publish(raw) {
  const clean = sanitizeOverlay(raw)
  await mkdir(VERSIONS, { recursive: true })
  const livePath = path.join(STORE, 'live.json')
  if (existsSync(livePath)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    await writeFile(path.join(VERSIONS, `${stamp}.json`), await readFile(livePath, 'utf8'))
  }
  const files = (await readdir(VERSIONS).catch(() => [])).filter((f) => f.endsWith('.json')).sort()
  while (files.length > MAX_VERSIONS) await unlink(path.join(VERSIONS, files.shift()))
  await writeFile(livePath, JSON.stringify(clean, null, 2))
  await writeFile(path.join(STORE, 'draft.json'), JSON.stringify(clean, null, 2))
  return clean
}
async function listVersions() {
  const files = await readdir(VERSIONS).catch(() => [])
  const out = []
  for (const f of files.filter((x) => x.endsWith('.json'))) {
    const s = await stat(path.join(VERSIONS, f))
    out.push({ pathname: `versions/${f}`, uploadedAt: s.mtime.toISOString(), size: s.size })
  }
  return out.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1))
}
async function restoreVersionToDraft(pathname) {
  const base = path.basename(String(pathname || ''))
  if (!base.endsWith('.json')) return null
  const data = await readJson(path.join(VERSIONS, base))
  if (!data) return null
  return writeDraft(data)
}

// ---- API routes ----------------------------------------------------------
async function handleApi(req, res, url) {
  const p = url.pathname

  if (p === '/api/editor/auth') {
    if (req.method === 'DELETE') {
      res.setHeader('Set-Cookie', devClearCookie())
      return sendJson(res, 200, { ok: true })
    }
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' })
    let body = {}
    try {
      body = await readJsonBody(req)
    } catch {}
    if (!checkPassword(typeof body?.password === 'string' ? body.password : '')) return sendJson(res, 401, { ok: false })
    res.setHeader('Set-Cookie', devAuthCookie(makeToken()))
    return sendJson(res, 200, { ok: true })
  }

  if (p === '/api/content') {
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'method_not_allowed' })
    const wantsDraft = /[?&]draft=1(?:&|$)/.test(req.url || '')
    if (wantsDraft) {
      if (!isAuthed(req)) return sendJson(res, 401, { error: 'unauthorized' })
      return sendJson(res, 200, { overlay: await getDraft() })
    }
    return sendJson(res, 200, { overlay: await getLive() })
  }

  if (p === '/api/editor/load') {
    if (!requireAuth(req, res)) return
    return sendJson(res, 200, { overlay: await getDraft() })
  }
  if (p === '/api/editor/save') {
    if (!requireAuth(req, res)) return
    return sendJson(res, 200, { ok: true, overlay: await writeDraft(await readJsonBody(req)) })
  }
  if (p === '/api/editor/publish') {
    if (!requireAuth(req, res)) return
    return sendJson(res, 200, { ok: true, overlay: await publish(await readJsonBody(req)) })
  }
  if (p === '/api/editor/versions') {
    if (!requireAuth(req, res)) return
    if (req.method === 'GET') return sendJson(res, 200, { versions: await listVersions() })
    if (req.method === 'POST') {
      const body = await readJsonBody(req)
      const overlay = await restoreVersionToDraft(body?.pathname)
      return overlay ? sendJson(res, 200, { ok: true, overlay }) : sendJson(res, 400, { error: 'invalid_version' })
    }
    return sendJson(res, 405, { error: 'method_not_allowed' })
  }
  if (p === '/api/editor/upload') {
    return sendJson(res, 501, { error: 'upload_local_unsupported', message: 'Image upload requires a deployed HTTPS environment with Blob. Use a URL locally.' })
  }
  return sendJson(res, 404, { error: 'not_found' })
}

// ---- Static files --------------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

async function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname)
  if (pathname === '/') pathname = '/index.html'
  // cleanUrls: /editor -> editor.html, /mission -> mission.html
  let filePath = path.join(ROOT, pathname)
  if (!path.extname(filePath)) {
    if (existsSync(filePath + '.html')) filePath += '.html'
    else if (existsSync(path.join(filePath, 'index.html'))) filePath = path.join(filePath, 'index.html')
  }
  // Prevent path traversal outside the project root.
  if (!path.resolve(filePath).startsWith(ROOT)) {
    res.statusCode = 403
    return res.end('Forbidden')
  }
  try {
    const data = await readFile(filePath)
    res.statusCode = 200
    res.setHeader('Content-Type', MIME[path.extname(filePath)] || 'application/octet-stream')
    res.setHeader('Cache-Control', 'no-store')
    return res.end(data)
  } catch {
    res.statusCode = 404
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.end('<h1>404</h1>')
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url)
    return await serveStatic(req, res, url)
  } catch (e) {
    sendJson(res, 500, { error: 'server_error', message: String(e?.message || e) })
  }
})

server.listen(PORT, () => {
  console.log(`[dev] A New Dawn running at http://localhost:${PORT}`)
  console.log(`[dev] Editor:  http://localhost:${PORT}/editor   (password: ${process.env.EDITOR_PASSWORD})`)
})
