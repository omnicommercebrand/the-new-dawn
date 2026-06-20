// ============================================================
// A NEW DAWN — Editor Auth (Node serverless)
// Stateless, HMAC-signed cookie. No database. The password lives
// only in the EDITOR_PASSWORD env var and is never sent to the client.
// Tokens are signed with EDITOR_SECRET (or a deterministic fallback)
// and verified in constant time.
// ============================================================

import crypto from 'node:crypto'

const COOKIE = 'nd_editor_auth'
const MAX_AGE_SEC = 60 * 60 * 24 * 14 // 14 days

function getSecret() {
  const explicit = process.env.EDITOR_SECRET
  if (explicit && explicit.length >= 32) return explicit
  const pw = process.env.EDITOR_PASSWORD || ''
  // Deterministic fallback so deploys without EDITOR_SECRET still work,
  // but rotating EDITOR_PASSWORD also rotates every existing token.
  return crypto.createHash('sha256').update('nd_editor_auth_v1:' + pw).digest('hex')
}

function sign(payload) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

export function safeEq(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

export function makeToken() {
  const exp = Date.now() + MAX_AGE_SEC * 1000
  const nonce = crypto.randomBytes(16).toString('base64url')
  const payload = `${exp}.${nonce}`
  return `${payload}.${sign(payload)}`
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string' || token.length > 512) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [exp, nonce, sig] = parts
  const expNum = Number(exp)
  if (!Number.isFinite(expNum) || Date.now() > expNum) return false
  return safeEq(sig, sign(`${exp}.${nonce}`))
}

export function parseCookies(header) {
  const out = {}
  if (!header || typeof header !== 'string') return out
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    if (k) out[k] = decodeURIComponent(v)
  }
  return out
}

// True if EDITOR_PASSWORD is configured AND the request carries a valid token.
export function isAuthed(req) {
  if (!process.env.EDITOR_PASSWORD) return false
  const jar = parseCookies(req.headers?.cookie)
  return verifyToken(jar[COOKIE])
}

export function checkPassword(password) {
  const expected = process.env.EDITOR_PASSWORD
  if (!expected) return false
  if (typeof password !== 'string' || password.length === 0 || password.length > 256) return false
  return safeEq(password, expected)
}

export function authCookie(token) {
  return [
    `${COOKIE}=${token}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${MAX_AGE_SEC}`,
  ].join('; ')
}

export function clearCookie() {
  return [`${COOKIE}=`, 'HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/', 'Max-Age=0'].join('; ')
}

// Send a JSON response with no-store caching.
export function sendJson(res, status, body, extraHeaders) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v)
  }
  res.end(JSON.stringify(body))
}

// Require auth or end the response with 401. Returns true if authed.
export function requireAuth(req, res) {
  if (isAuthed(req)) return true
  sendJson(res, 401, { error: 'unauthorized' })
  return false
}

// Read + JSON-parse the request body. Works whether the platform has
// already parsed it (req.body) or we must read the raw stream. Caps size.
const MAX_BODY_BYTES = 2 * 1024 * 1024 // 2 MB — overlays are small JSON
export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return {} }
  }
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error('payload too large')
    chunks.push(chunk)
  }
  if (size === 0) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return {}
  }
}
