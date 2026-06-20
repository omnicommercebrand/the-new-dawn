// ============================================================
// POST   /api/editor/auth   { password }  -> sets signed cookie
// DELETE /api/editor/auth                 -> clears cookie
// Best-effort in-memory rate limit + constant-time response delay
// make brute force impractical. Password compared in constant time.
// ============================================================

import { checkPassword, makeToken, authCookie, clearCookie, sendJson, readJsonBody } from '../_lib/auth.js'

const attempts = new Map()
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 8
const MIN_RESPONSE_MS = 350

function getIp(req) {
  const xf = req.headers['x-forwarded-for']
  if (xf) return String(xf).split(',')[0].trim()
  return req.headers['x-real-ip'] || 'unknown'
}

function checkRate(ip) {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now - entry.firstAt > WINDOW_MS) return { ok: true, retryAfter: 0 }
  if (entry.count >= MAX_ATTEMPTS) {
    return { ok: false, retryAfter: Math.ceil((WINDOW_MS - (now - entry.firstAt)) / 1000) }
  }
  return { ok: true, retryAfter: 0 }
}

function bump(ip) {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now - entry.firstAt > WINDOW_MS) attempts.set(ip, { count: 1, firstAt: now })
  else entry.count += 1
}

async function settle(start) {
  const elapsed = Date.now() - start
  if (elapsed < MIN_RESPONSE_MS) await new Promise((r) => setTimeout(r, MIN_RESPONSE_MS - elapsed))
}

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearCookie())
    return sendJson(res, 200, { ok: true })
  }
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'method_not_allowed' })
  }
  if (!process.env.EDITOR_PASSWORD) {
    return sendJson(res, 500, { error: 'editor_not_configured' })
  }

  const start = Date.now()
  const ip = getIp(req)
  const limit = checkRate(ip)
  if (!limit.ok) {
    await settle(start)
    return sendJson(res, 429, { ok: false, error: 'too_many_attempts' }, { 'Retry-After': String(limit.retryAfter) })
  }

  let body
  try {
    body = await readJsonBody(req)
  } catch {
    body = {}
  }
  const password = typeof body?.password === 'string' ? body.password : ''
  const ok = checkPassword(password)
  if (ok) attempts.delete(ip)
  else bump(ip)

  await settle(start)
  if (!ok) return sendJson(res, 401, { ok: false })

  res.setHeader('Set-Cookie', authCookie(makeToken()))
  return sendJson(res, 200, { ok: true })
}
