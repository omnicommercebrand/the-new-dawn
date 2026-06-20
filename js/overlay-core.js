// ============================================================
// A NEW DAWN — Overlay Core
// Pure, dependency-free logic for the content-overlay system.
// Shared by the runtime loader, the editor UI, the publish API,
// and the node test suite. NO DOM access here — keep it pure so
// it runs identically in the browser and in node --test.
//
// Overlay shape (versioned):
//   {
//     v: 1,
//     theme: { palette: 'sacred-earth', vars: { '--sacred-gold': '#fff' } },
//     text:   { 'home.hero.title': 'Hello <em>world</em>' },
//     images: { 'home.hero.bg': 'https://.../x.jpg' },
//     order:  { 'home.offerings': ['c2','c1','c3'] },
//     hidden: { 'home.testimonial': true }
//   }
//
// Keys (paths) are dot/colon-safe slugs that map to data-edit /
// data-section attributes in the HTML. They are treated as opaque
// identifiers and are strictly validated before use.
// ============================================================

import { THEME_VARS, isPaletteId, DEFAULT_PALETTE_ID, getPalette } from './palettes.js'

export const OVERLAY_VERSION = 1

export function emptyOverlay() {
  return {
    v: OVERLAY_VERSION,
    theme: { palette: DEFAULT_PALETTE_ID, vars: {} },
    text: {},
    images: {},
    order: {},
    hidden: {},
  }
}

// ---- Identifier / value validators -------------------------------------

// data-edit / data-section keys: lowercase words separated by . or -
// e.g. "home.hero.title", "offerings.card-1.body". Max length guards DoS.
const KEY_RE = /^[a-z0-9]+(?:[.\-][a-z0-9]+)*$/
const MAX_KEY_LEN = 120
const MAX_TEXT_LEN = 20000
const MAX_KEYS_PER_MAP = 2000
const MAX_ORDER_ITEMS = 200

export function isValidKey(key) {
  return typeof key === 'string' && key.length > 0 && key.length <= MAX_KEY_LEN && KEY_RE.test(key)
}

// Color values accepted for individual var overrides.
// hex (#rgb/#rgba/#rrggbb/#rrggbbaa), rgb()/rgba(), hsl()/hsla().
const HEX_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
const RGB_RE = /^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*[\d.]+\s*)?\)$/
const HSL_RE = /^hsla?\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*(?:,\s*[\d.]+\s*)?\)$/
// For composite vars like --border-* the site stores "1px solid rgba(...)".
const BORDER_RE = /^[0-9]{1,2}px\s+(?:solid|dashed|dotted)\s+(?:#(?:[0-9a-fA-F]{3,8})|rgba?\([\d.,\s]+\)|hsla?\([\d.%,\s]+\))$/

export function isValidColor(v) {
  if (typeof v !== 'string') return false
  const s = v.trim()
  if (s.length === 0 || s.length > 64) return false
  return HEX_RE.test(s) || RGB_RE.test(s) || HSL_RE.test(s)
}

function isValidThemeVarValue(varName, v) {
  if (typeof v !== 'string') return false
  const s = v.trim()
  if (s.length === 0 || s.length > 80) return false
  if (varName === '--border-subtle' || varName === '--border-glow') {
    return BORDER_RE.test(s)
  }
  return isValidColor(s)
}

// Image URLs: absolute https (Blob/CDN) or site-relative paths only.
// Blocks javascript:, data:, http: (mixed content), and protocol-relative.
export function isValidImageUrl(v) {
  if (typeof v !== 'string') return false
  const s = v.trim()
  if (s.length === 0 || s.length > 2048) return false
  if (s.startsWith('/') && !s.startsWith('//')) return true // site-relative
  if (/^https:\/\/[^\s'"<>]+$/i.test(s)) return true
  return false
}

// ---- HTML sanitizer (tiny, whitelist-based) ----------------------------
// Editable text fields may contain a few inline formatting tags only.
// Everything else is escaped. This runs at publish time (node) AND at
// runtime before insertion, so a tampered draft can never inject script.
const ALLOWED_TAGS = new Set(['em', 'strong', 'b', 'i', 'br', 'span'])

export function sanitizeHtml(input) {
  if (typeof input !== 'string') return ''
  let s = input
  if (s.length > MAX_TEXT_LEN) s = s.slice(0, MAX_TEXT_LEN)
  // Tokenize tags; escape text; allow only whitelisted tags w/o attributes.
  let out = ''
  let i = 0
  while (i < s.length) {
    const lt = s.indexOf('<', i)
    if (lt === -1) {
      out += escapeText(s.slice(i))
      break
    }
    out += escapeText(s.slice(i, lt))
    const gt = s.indexOf('>', lt)
    if (gt === -1) {
      out += escapeText(s.slice(lt))
      break
    }
    const raw = s.slice(lt + 1, gt).trim()
    const m = /^(\/?)([a-zA-Z0-9]+)/.exec(raw)
    if (m && ALLOWED_TAGS.has(m[2].toLowerCase())) {
      const closing = m[1] === '/'
      const tag = m[2].toLowerCase()
      out += closing ? `</${tag}>` : tag === 'br' ? '<br>' : `<${tag}>`
    } else {
      // Not an allowed tag — escape the whole thing as text.
      out += escapeText(s.slice(lt, gt + 1))
    }
    i = gt + 1
  }
  return out
}

function escapeText(t) {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ---- Normalization + sanitization of a full overlay --------------------
// Produces a clean, safe overlay. Drops anything invalid silently.
// Use this on EVERY read (runtime) and EVERY write (publish/save) so a
// corrupted or malicious blob can never reach the DOM or be persisted.
export function sanitizeOverlay(raw) {
  const o = emptyOverlay()
  if (!raw || typeof raw !== 'object') return o

  // theme
  const theme = raw.theme
  if (theme && typeof theme === 'object') {
    if (isPaletteId(theme.palette)) o.theme.palette = theme.palette
    if (theme.vars && typeof theme.vars === 'object') {
      for (const [k, v] of Object.entries(theme.vars)) {
        if (THEME_VARS.includes(k) && isValidThemeVarValue(k, v)) {
          o.theme.vars[k] = String(v).trim()
        }
      }
    }
  }

  o.text = sanitizeStringMap(raw.text, (v) => sanitizeHtml(v))
  o.images = sanitizeStringMap(raw.images, (v) => (isValidImageUrl(v) ? v.trim() : undefined))

  // order: key -> array of valid keys, deduped, capped
  if (raw.order && typeof raw.order === 'object') {
    let count = 0
    for (const [k, arr] of Object.entries(raw.order)) {
      if (count >= MAX_KEYS_PER_MAP) break
      if (!isValidKey(k) || !Array.isArray(arr)) continue
      const seen = new Set()
      const clean = []
      for (const id of arr) {
        if (clean.length >= MAX_ORDER_ITEMS) break
        if (isValidKey(id) && !seen.has(id)) {
          seen.add(id)
          clean.push(id)
        }
      }
      if (clean.length) {
        o.order[k] = clean
        count++
      }
    }
  }

  // hidden: key -> true
  if (raw.hidden && typeof raw.hidden === 'object') {
    let count = 0
    for (const [k, v] of Object.entries(raw.hidden)) {
      if (count >= MAX_KEYS_PER_MAP) break
      if (isValidKey(k) && v === true) {
        o.hidden[k] = true
        count++
      }
    }
  }

  return o
}

function sanitizeStringMap(src, transform) {
  const out = {}
  if (!src || typeof src !== 'object') return out
  let count = 0
  for (const [k, v] of Object.entries(src)) {
    if (count >= MAX_KEYS_PER_MAP) break
    if (!isValidKey(k)) continue
    const val = transform(v)
    if (val !== undefined && val !== null) {
      out[k] = val
      count++
    }
  }
  return out
}

// ---- Theme resolution --------------------------------------------------
// Final CSS vars = palette base, then individual overrides on top.
export function resolveThemeVars(overlay) {
  const o = overlay && overlay.theme ? overlay.theme : { palette: DEFAULT_PALETTE_ID, vars: {} }
  const base = getPalette(o.palette).vars
  const vars = { ...base }
  if (o.vars && typeof o.vars === 'object') {
    for (const [k, v] of Object.entries(o.vars)) {
      if (THEME_VARS.includes(k) && isValidThemeVarValue(k, v)) vars[k] = v
    }
  }
  return vars
}

// ---- Ordering helper ---------------------------------------------------
// Given the DOM-found child ids and a desired order array, return the
// final id order: desired ids first (that still exist), then any new ids
// not present in the saved order (appended in their original position).
export function applyOrder(currentIds, desiredOrder) {
  if (!Array.isArray(desiredOrder) || desiredOrder.length === 0) return currentIds.slice()
  const present = new Set(currentIds)
  const used = new Set()
  const result = []
  for (const id of desiredOrder) {
    if (present.has(id) && !used.has(id)) {
      result.push(id)
      used.add(id)
    }
  }
  for (const id of currentIds) {
    if (!used.has(id)) result.push(id)
  }
  return result
}

// ---- Immutable array move (for the editor reorder buttons) -------------
export function moveItem(arr, from, to) {
  const next = arr.slice()
  if (from < 0 || from >= next.length || to < 0 || to >= next.length) return next
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
