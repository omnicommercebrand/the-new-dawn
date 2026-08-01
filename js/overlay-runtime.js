// ============================================================
// A NEW DAWN — Overlay Runtime
// Loads the published (or draft) content overlay and applies it to
// the static HTML without mutating the source files. Runs on every
// public page. Theme is also applied instantly from a localStorage
// cache by an inline <head> snippet to prevent a color flash (FOUC).
//
// Annotation contract (in the HTML):
//   data-edit="key"        -> editable rich text (innerHTML, sanitized)
//   data-edit-img="key"    -> editable <img> (sets src)
//   data-edit-bg="key"     -> editable background image (sets background-image)
//   data-section="key"     -> reorderable container; children have data-order-id="sub"
//   data-hideable="key"    -> may be hidden by the overlay
//
// The editor talks to this runtime via postMessage for instant preview.
// ============================================================

import { sanitizeOverlay, resolveThemeVars, sanitizeHtml, isValidImageUrl, applyOrder } from './overlay-core.js'

const THEME_CACHE_KEY = 'nd_theme_cache_v1'
const OVERLAY_CACHE_KEY = 'nd_overlay_cache_v1'

const isDraft = /[?&]draft=1(?:&|$)/.test(location.search)
let currentOverlay = null

// ---- Pristine baselines ---------------------------------------------------
// The static HTML is the source of truth. We snapshot each editable element's
// ORIGINAL value once, before any overlay is applied, so that when an override
// is removed (e.g. the editor "reset" button) we can restore the real baseline
// instead of leaving the last-applied value stuck in the DOM.
const baseText = new Map()
const baseImg = new Map()
const baseBg = new Map()
let baselinesCaptured = false
function captureBaselines() {
  if (baselinesCaptured) return
  document.querySelectorAll('[data-edit]').forEach((el) => {
    const k = el.getAttribute('data-edit')
    if (k != null && !baseText.has(k)) baseText.set(k, el.innerHTML)
  })
  document.querySelectorAll('[data-edit-img]').forEach((el) => {
    const k = el.getAttribute('data-edit-img')
    if (k != null && !baseImg.has(k)) baseImg.set(k, { src: el.getAttribute('src'), srcset: el.getAttribute('srcset') })
  })
  document.querySelectorAll('[data-edit-bg]').forEach((el) => {
    const k = el.getAttribute('data-edit-bg')
    if (k != null && !baseBg.has(k)) baseBg.set(k, el.style.backgroundImage || '')
  })
  baselinesCaptured = true
  // Expose the text baselines to the editor (same-origin iframe) so its
  // "reset target" matches exactly what this runtime reverts to.
  try {
    const text = {}
    baseText.forEach((v, k) => {
      text[k] = v
    })
    window.__ndBaselines = { text }
  } catch {}
}

// ---- Theme ----------------------------------------------------------------
function applyTheme(overlay) {
  const vars = resolveThemeVars(overlay)
  const root = document.documentElement
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  try {
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(vars))
  } catch {}
}

// ---- Text -----------------------------------------------------------------
// Walk EVERY editable element: apply the override if present, otherwise restore
// the pristine baseline. This makes removing an override (reset) revert the DOM.
function applyText(overlay) {
  const map = overlay.text || {}
  const inEditor = window.parent !== window
  document.querySelectorAll('[data-edit]').forEach((el) => {
    const key = el.getAttribute('data-edit')
    if (key == null) return
    let html =
      key in map ? sanitizeHtml(map[key]) : baseText.has(key) ? baseText.get(key) : el.innerHTML
    // Nêhiyaw carries a circumflex the editor's keyboard flow tends to drop.
    html = html.replace(/Nehiyaw/g, 'Nêhiyaw')
    // Footer location reads as a place list — render separators as middots
    // even when a period was typed ("Canada . Hawaii" -> "Canada · Hawaii").
    if (key.endsWith('.footer.location')) html = html.replace(/ \. /g, ' · ')
    if (el.innerHTML !== html) el.innerHTML = html
    // A cleared field often still holds <br> or &nbsp;, which renders as a
    // blank gap. Collapse those on the public page, but keep them visible in
    // the editor iframe so the element can still be clicked and refilled.
    const isBlank = key in map && !html.replace(/<br\s*\/?>|&nbsp;| /gi, '').trim()
    el.style.display = isBlank && !inEditor ? 'none' : ''
  })
}

// ---- Images ---------------------------------------------------------------
function applyImages(overlay) {
  const map = overlay.images || {}
  document.querySelectorAll('[data-edit-img]').forEach((el) => {
    const key = el.getAttribute('data-edit-img')
    if (key == null) return
    if (key in map && isValidImageUrl(map[key])) {
      if (el.getAttribute('src') !== map[key]) el.setAttribute('src', map[key])
      el.removeAttribute('srcset')
    } else {
      const b = baseImg.get(key)
      if (b) {
        if (b.src != null && el.getAttribute('src') !== b.src) el.setAttribute('src', b.src)
        if (b.srcset != null) el.setAttribute('srcset', b.srcset)
        else el.removeAttribute('srcset')
      }
    }
  })
  document.querySelectorAll('[data-edit-bg]').forEach((el) => {
    const key = el.getAttribute('data-edit-bg')
    if (key == null) return
    if (key in map && isValidImageUrl(map[key])) {
      el.style.backgroundImage = `url("${map[key]}")`
    } else if (baseBg.has(key)) {
      el.style.backgroundImage = baseBg.get(key)
    }
  })
}

// ---- Reorder --------------------------------------------------------------
function applyOrders(overlay) {
  const map = overlay.order || {}
  for (const [key, desired] of Object.entries(map)) {
    const container = document.querySelector(`[data-section="${cssEscape(key)}"]`)
    if (!container) continue
    const children = Array.from(container.children).filter((c) => c.hasAttribute('data-order-id'))
    if (children.length < 2) continue
    const byId = new Map(children.map((c) => [c.getAttribute('data-order-id'), c]))
    const currentIds = children.map((c) => c.getAttribute('data-order-id'))
    const finalIds = applyOrder(currentIds, desired)
    // Re-append in the resolved order (stable, no flicker for unchanged order).
    let changed = false
    finalIds.forEach((id, i) => {
      if (currentIds[i] !== id) changed = true
    })
    if (!changed) continue
    finalIds.forEach((id) => {
      const node = byId.get(id)
      if (node) container.appendChild(node)
    })
  }
}

// ---- Hidden ---------------------------------------------------------------
function applyHidden(overlay) {
  const map = overlay.hidden || {}
  document.querySelectorAll('[data-hideable]').forEach((el) => {
    const key = el.getAttribute('data-hideable')
    el.style.display = map[key] === true ? 'none' : ''
  })
}

// ---- Apply all ------------------------------------------------------------
function applyOverlay(raw) {
  captureBaselines() // snapshot pristine DOM before the first mutation
  const overlay = sanitizeOverlay(raw)
  currentOverlay = overlay
  applyTheme(overlay)
  applyText(overlay)
  applyImages(overlay)
  applyOrders(overlay)
  applyHidden(overlay)
  try {
    localStorage.setItem(OVERLAY_CACHE_KEY, JSON.stringify(overlay))
  } catch {}
  document.dispatchEvent(new CustomEvent('nd:overlay-applied', { detail: { overlay } }))
}

function cssEscape(s) {
  if (window.CSS && CSS.escape) return CSS.escape(s)
  return String(s).replace(/["\\]/g, '\\$&')
}

// ---- Boot -----------------------------------------------------------------
async function boot() {
  // Apply cached overlay immediately (fast, avoids flash for repeat visits).
  try {
    const cached = localStorage.getItem(OVERLAY_CACHE_KEY)
    if (cached) applyOverlay(JSON.parse(cached))
  } catch {}

  try {
    const url = isDraft ? '/api/content?draft=1' : '/api/content'
    const res = await fetch(url, { cache: isDraft ? 'no-store' : 'default', credentials: 'same-origin' })
    if (res.ok) {
      const data = await res.json()
      applyOverlay(data.overlay)
    }
  } catch {
    // Network failure: the static HTML + cached overlay still render fine.
  }
}

// Instant preview channel for the editor (only honored inside an iframe).
if (window.parent !== window) {
  window.addEventListener('message', (e) => {
    const d = e.data
    if (!d || typeof d !== 'object') return
    if (d.type === 'nd:preview' && d.overlay) applyOverlay(d.overlay)
  })
  // Snapshot pristine baselines, then tell the editor we're ready. Capturing
  // before any overlay applies guarantees window.__ndBaselines holds the true
  // original values the editor uses as its "reset" target.
  const announceReady = () => {
    captureBaselines()
    try {
      window.parent.postMessage({ type: 'nd:runtime-ready' }, location.origin)
    } catch {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', announceReady)
  else announceReady()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot)
} else {
  boot()
}

export { applyOverlay }
