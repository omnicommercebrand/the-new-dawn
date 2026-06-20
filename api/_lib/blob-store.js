// ============================================================
// A NEW DAWN — Blob Store (Node serverless)
// Persists the content overlay in Vercel Blob as JSON.
//   content/live.json     -> what visitors see (published)
//   content/draft.json    -> editor work-in-progress (not public)
//   content/versions/*.json -> immutable snapshots for revert
//
// All reads/writes go through here so caching + sanitization stay
// consistent. Requires BLOB_READ_WRITE_TOKEN (auto-set on Vercel
// when a Blob store is linked to the project).
// ============================================================

import { put, list } from '@vercel/blob'
import { sanitizeOverlay, emptyOverlay } from '../../js/overlay-core.js'

export const LIVE_PATH = 'content/live.json'
export const DRAFT_PATH = 'content/draft.json'
export const VERSIONS_PREFIX = 'content/versions/'
const MAX_VERSIONS = 30

// Find the public URL of an exact blob pathname (Blob list is prefix-based).
async function findUrl(pathname) {
  const { blobs } = await list({ prefix: pathname, limit: 1000 })
  const hit = blobs.find((b) => b.pathname === pathname)
  return hit ? hit.url : null
}

async function readJsonAt(pathname) {
  const url = await findUrl(pathname)
  if (!url) return null
  // Cache-bust so we never read a stale CDN copy right after a write.
  const res = await fetch(url + '?t=' + Date.now(), { cache: 'no-store' })
  if (!res.ok) return null
  try {
    return await res.json()
  } catch {
    return null
  }
}

// Always returns a sanitized overlay (never throws on bad data).
export async function getLive() {
  const raw = await readJsonAt(LIVE_PATH)
  return sanitizeOverlay(raw || emptyOverlay())
}

export async function getDraft() {
  const raw = await readJsonAt(DRAFT_PATH)
  if (raw) return sanitizeOverlay(raw)
  // Fall back to live so the editor opens on the current published state.
  return getLive()
}

async function writeJsonAt(pathname, obj) {
  const body = JSON.stringify(obj)
  const blob = await put(pathname, body, {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  })
  return blob.url
}

export async function writeDraft(overlay) {
  const clean = sanitizeOverlay(overlay)
  await writeJsonAt(DRAFT_PATH, clean)
  return clean
}

// Publish: snapshot current live -> versions, then write new live + draft.
export async function publish(overlay) {
  const clean = sanitizeOverlay(overlay)
  // Snapshot the version we are about to replace (best-effort).
  try {
    const prev = await readJsonAt(LIVE_PATH)
    if (prev) {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      await writeJsonAt(`${VERSIONS_PREFIX}${stamp}.json`, prev)
      await pruneVersions()
    }
  } catch {
    // Snapshotting must never block a publish.
  }
  await writeJsonAt(LIVE_PATH, clean)
  await writeJsonAt(DRAFT_PATH, clean)
  return clean
}

export async function listVersions() {
  const { blobs } = await list({ prefix: VERSIONS_PREFIX, limit: 1000 })
  return blobs
    .filter((b) => b.pathname.endsWith('.json'))
    .map((b) => ({
      pathname: b.pathname,
      url: b.url,
      label: b.pathname.slice(VERSIONS_PREFIX.length).replace(/\.json$/, ''),
      uploadedAt: b.uploadedAt,
      size: b.size,
    }))
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
}

export async function getVersion(pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith(VERSIONS_PREFIX) || !pathname.endsWith('.json')) {
    return null
  }
  const raw = await readJsonAt(pathname)
  return raw ? sanitizeOverlay(raw) : null
}

// Restore a version into the draft (does not auto-publish).
export async function restoreVersionToDraft(pathname) {
  const v = await getVersion(pathname)
  if (!v) return null
  return writeDraft(v)
}

async function pruneVersions() {
  const versions = await listVersions()
  if (versions.length <= MAX_VERSIONS) return
  const { del } = await import('@vercel/blob')
  const old = versions.slice(MAX_VERSIONS)
  await Promise.all(old.map((v) => del(v.url).catch(() => {})))
}
