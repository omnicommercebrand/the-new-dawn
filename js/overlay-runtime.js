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
    // Nêhiyaw carries a circumflex the editor's keyboard flow tends to drop,
    // and Misty spells her spirit name with the eñe.
    html = html.replace(/Nehiyaw/g, 'Nêhiyaw').replace(/Shakina/g, 'Shakiña')
    // Typed double hyphens render as a true em-dash.
    html = html.replace(/ -- /g, ' \u2014 ')
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

// ---- Term links & glossary ------------------------------------------------
// Modality names render as outbound links (or as an ⓘ popover when there is
// no official page). Runs on PUBLIC pages only — never inside the editor
// iframe — so annotations are display-time and never saved into the overlay.
// Order matters: composite phrases must precede their sub-phrases.
const TERM_RULES = [
  { re: /Neurofascial(?:\s+Reset|\s+Specialist)?/g, url: 'https://www.rapidnfr.com/what-is-rapid' },
  { re: /Onsen(?:\s+Structural\s*(?:&|and)\s*Functional\s+Alignment)?/g, url: 'https://www.onsentherapy.com/about' },
  { re: /Emotion,\s*Body\s*&\s*Belief\s*Code/g, url: 'https://discoverhealing.com/' },
  { re: /Emotion\s+Code/g, url: 'https://discoverhealing.com/the-emotion-code/' },
  { re: /Body\s+Code/g, url: 'https://discoverhealing.com/the-body-code/' },
  { re: /Belief\s+Code/g, url: 'https://discoverhealing.com/the-belief-code/' },
  { re: /(?:Advanced\s+)?PSYCH-K®?/g, url: 'https://www.psych-k.com/about/' },
  { re: /Registered\s+Massage\s+Therap(?:ist|y)/g,
    desc: 'A licensed healthcare professional trained in therapeutic bodywork — assessment and treatment of soft tissue and joints to restore, maintain and rehabilitate physical function.' },
  { re: /Healing\s+Guide/g,
    desc: 'One who walks beside you through your own healing — holding space, reflecting truth, and supporting your remembrance of the healer within.' },
  { re: /Gridworker/g,
    desc: 'One who works with the energetic grid of the Earth — harmonizing land, sacred sites and spaces so that people and places can thrive.' },
  { re: /Rainbow\s+Energy\s+Healing/g,
    desc: 'A full-spectrum energy healing modality — restoring sensation, vitality and flow by working with the complete range of the body’s subtle energies.' },
  { re: /\bCoach\b/g,
    desc: 'Certified coaching for transformation — clarity, accountability and aligned action in life, health and business.' },
]

function annotateTerms() {
  if (window.parent !== window) return // never inside the editor preview
  const root = document.querySelector('main')
  if (!root) return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT
      for (let e = n.parentElement; e && e !== root; e = e.parentElement) {
        const t = e.tagName
        if (t === 'A' || t === 'SCRIPT' || t === 'STYLE' || t === 'BUTTON' || t === 'FORM') return NodeFilter.FILTER_REJECT
        if (e.classList.contains('term-link') || e.classList.contains('term-info')) return NodeFilter.FILTER_REJECT
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })
  const nodes = []
  while (walker.nextNode()) nodes.push(walker.currentNode)
  for (const node of nodes) {
    const text = node.nodeValue
    // Collect non-overlapping matches, earlier rules win on overlap.
    const taken = []
    const matches = []
    for (const rule of TERM_RULES) {
      rule.re.lastIndex = 0
      let m
      while ((m = rule.re.exec(text))) {
        const s = m.index, e = s + m[0].length
        if (!taken.some(([a, b]) => s < b && e > a)) {
          taken.push([s, e])
          matches.push({ s, e, str: m[0], rule })
        }
      }
    }
    if (!matches.length) continue
    matches.sort((a, b) => a.s - b.s)
    const frag = document.createDocumentFragment()
    let pos = 0
    for (const m of matches) {
      if (m.s > pos) frag.appendChild(document.createTextNode(text.slice(pos, m.s)))
      if (m.rule.url) {
        const a = document.createElement('a')
        a.className = 'term-link'
        a.href = m.rule.url
        a.target = '_blank'
        a.rel = 'noopener'
        a.textContent = m.str
        frag.appendChild(a)
      } else {
        const span = document.createElement('span')
        span.className = 'term-info'
        span.appendChild(document.createTextNode(m.str))
        const btn = document.createElement('button')
        btn.className = 'term-i'
        btn.type = 'button'
        btn.setAttribute('aria-label', 'More about ' + m.str)
        btn.textContent = 'i'
        span.appendChild(btn)
        const pop = document.createElement('span')
        pop.className = 'term-pop'
        pop.textContent = m.rule.desc
        span.appendChild(pop)
        frag.appendChild(span)
      }
      pos = m.e
    }
    if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)))
    node.parentNode.replaceChild(frag, node)
  }
}

// One delegated handler toggles ⓘ popovers (public pages only).
if (window.parent === window) {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('.term-i')
    document.querySelectorAll('.term-info.open').forEach((el) => {
      if (!btn || el !== btn.parentElement) el.classList.remove('open')
    })
    if (btn) btn.parentElement.classList.toggle('open')
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
  annotateTerms() // applyText resets innerHTML, so re-annotate after every apply
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
  annotateTerms() // safety net: annotate even if no overlay ever applied
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
