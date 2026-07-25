// ============================================================
// A NEW DAWN — Content Editor
// Auto-discovers editable fields from the live page's annotations
// (data-edit / data-edit-img / data-edit-bg / data-section /
// data-hideable), edits one global content overlay, previews it
// instantly in the iframe via postMessage, and saves / publishes
// through the authed /api/editor/* routes.
//
// The annotations in the HTML are the single source of truth — there
// is no separate schema to keep in sync. Validators and palettes are
// imported from the SAME pure modules the runtime and tests use, so
// the editor can never drift from what actually gets applied.
// ============================================================

import { emptyOverlay, isValidImageUrl, isValidColor, moveItem, sanitizeHtml } from './overlay-core.js'
import { PALETTES, THEME_VARS, getPalette, DEFAULT_PALETTE_ID } from './palettes.js'

// Friendly, human names for the theme CSS variables so a non-technical
// client never has to read raw tokens like "--overlay-dark".
const VAR_LABELS = {
  '--deep-earth': 'Page background',
  '--forest': 'Dark section background',
  '--forest-mist': 'Soft section background',
  '--canopy': 'Card background',
  '--sacred-gold': 'Accent gold',
  '--gold-light': 'Light gold',
  '--gold-glow': 'Gold glow / highlight',
  '--dawn-rose': 'Rose accent',
  '--dawn-blush': 'Soft blush',
  '--warm-white': 'Main text',
  '--soft-cream': 'Heading text',
  '--muted-text': 'Muted text',
  '--overlay-dark': 'Dark image overlay',
  '--overlay-medium': 'Medium image overlay',
  '--border-subtle': 'Subtle borders',
  '--border-glow': 'Glowing borders',
}
const labelForVar = (vn) => VAR_LABELS[vn] || vn.replace(/^--/, '').replace(/-/g, ' ')

// Image upload (client-direct to Blob; bypasses the 4.5MB function limit).
import { upload as blobUpload } from 'https://esm.sh/@vercel/blob@2/client'

const ALLOWED_IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif']
const MAX_IMG_BYTES = 15 * 1024 * 1024
const BORDER_VARS = new Set(['--border-subtle', '--border-glow'])

const PAGES = [
  { id: 'index', label: 'Home', url: '/' },
  { id: 'mission', label: 'Mission', url: '/mission' },
  { id: 'offerings', label: 'Offerings', url: '/offerings' },
  { id: 'events', label: 'Events', url: '/events' },
  { id: 'story', label: 'Story', url: '/story' },
  { id: 'transformations', label: 'Transformations', url: '/transformations' },
  // Unlinked from the site nav, but kept editable — the testimonials still live here.
  { id: 'reviews', label: 'Reviews (unlinked)', url: '/reviews' },
]

// ---- State ---------------------------------------------------------------
let overlay = emptyOverlay()
let savedJson = '' // snapshot of last-saved overlay for dirty tracking
let currentPage = PAGES[0]
let scan = null // { texts, images, sections, hideables, initialText }
let frameReady = false

// ---- DOM refs ------------------------------------------------------------
const $ = (s) => document.querySelector(s)
const loginEl = $('#login')
const loginForm = $('#login-form')
const loginPw = $('#login-pw')
const loginErr = $('#login-error')
const loginBtn = $('#login-btn')
const appEl = $('#app')
const frame = $('#frame')
const pageSelect = $('#page-select')
const dirtyDot = $('#dirty-dot')
const btnSave = $('#btn-save')
const btnPublish = $('#btn-publish')
const btnLogout = $('#btn-logout')
const linkLive = $('#link-live')
const toastEl = $('#toast')

// ---- API helper ----------------------------------------------------------
async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = null
  try {
    data = await res.json()
  } catch {}
  return { ok: res.ok, status: res.status, data }
}

// ---- Toast + modal -------------------------------------------------------
let toastTimer = null
function toast(msg, kind = '') {
  toastEl.textContent = msg
  toastEl.className = 'show ' + kind
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastEl.className = ''), 2800)
}

function confirmModal(title, msg, okLabel = 'Confirm') {
  return new Promise((resolve) => {
    $('#modal-title').textContent = title
    $('#modal-msg').textContent = msg
    $('#modal-ok').textContent = okLabel
    const back = $('#modal-back')
    back.classList.add('show')
    const done = (val) => {
      back.classList.remove('show')
      $('#modal-ok').onclick = null
      $('#modal-cancel').onclick = null
      resolve(val)
    }
    $('#modal-ok').onclick = () => done(true)
    $('#modal-cancel').onclick = () => done(false)
  })
}

// ---- Dirty tracking ------------------------------------------------------
function markDirty() {
  const dirty = JSON.stringify(overlay) !== savedJson
  dirtyDot.classList.toggle('on', dirty)
  btnSave.disabled = !dirty
}
function snapshotSaved() {
  savedJson = JSON.stringify(overlay)
  markDirty()
}

window.addEventListener('beforeunload', (e) => {
  if (appEl.classList.contains('ready') && JSON.stringify(overlay) !== savedJson) {
    e.preventDefault()
    e.returnValue = ''
  }
})

// ---- Auth flow -----------------------------------------------------------
async function boot() {
  PAGES.forEach((p) => {
    const o = document.createElement('option')
    o.value = p.id
    o.textContent = p.label
    pageSelect.appendChild(o)
  })
  const res = await api('/api/editor/load')
  if (res.ok && res.data?.overlay) {
    overlay = res.data.overlay
    snapshotSaved()
    enterApp()
  } else {
    showLogin()
  }
}

function showLogin() {
  loginEl.style.display = 'flex'
  appEl.classList.remove('ready')
  setTimeout(() => loginPw.focus(), 50)
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  loginErr.textContent = ''
  loginBtn.disabled = true
  const res = await api('/api/editor/auth', { method: 'POST', body: { password: loginPw.value } })
  loginBtn.disabled = false
  if (res.ok) {
    loginPw.value = ''
    const load = await api('/api/editor/load')
    if (load.ok && load.data?.overlay) {
      overlay = load.data.overlay
      snapshotSaved()
      enterApp()
      return
    }
    loginErr.textContent = 'Signed in, but failed to load content. Refresh and try again.'
  } else if (res.status === 429) {
    loginErr.textContent = 'Too many attempts. Please wait a few minutes.'
  } else if (res.status === 500) {
    loginErr.textContent = 'Editor is not configured on the server (missing password).'
  } else {
    loginErr.textContent = 'Incorrect password.'
  }
})

btnLogout.addEventListener('click', async () => {
  if (JSON.stringify(overlay) !== savedJson) {
    const go = await confirmModal('Unsaved changes', 'You have unsaved draft changes. Log out anyway?', 'Log out')
    if (!go) return
  }
  await api('/api/editor/auth', { method: 'DELETE' })
  location.reload()
})

function enterApp() {
  loginEl.style.display = 'none'
  appEl.classList.add('ready')
  loadPage(currentPage)
}

// ---- Page / iframe -------------------------------------------------------
function loadPage(page) {
  currentPage = page
  pageSelect.value = page.id
  linkLive.href = page.url
  frameReady = false
  scan = null
  // Load the static page (no ?draft) — we push the working overlay via
  // postMessage as soon as the runtime announces it is ready.
  frame.src = page.url
}

pageSelect.addEventListener('change', () => {
  const page = PAGES.find((p) => p.id === pageSelect.value)
  if (page) loadPage(page)
})

// Runtime in the iframe posts this when it can receive previews.
window.addEventListener('message', (e) => {
  if (e.origin !== location.origin) return
  const d = e.data
  if (d && d.type === 'nd:runtime-ready') {
    frameReady = true
    sendPreview()
    // Give the runtime a tick to apply, then read the resulting DOM.
    setTimeout(initFromFrame, 60)
  }
})

// Fallback if the runtime is slow / a page lacks it: init on plain load.
frame.addEventListener('load', () => {
  setTimeout(() => {
    if (!scan) {
      sendPreview()
      initFromFrame()
    }
  }, 250)
})

function sendPreview() {
  if (!frameReady && !frame.contentWindow) return
  try {
    frame.contentWindow.postMessage({ type: 'nd:preview', overlay }, location.origin)
  } catch {}
}

// ---- Discover editable fields from the iframe DOM ------------------------
function groupOf(el) {
  const g = el.closest('[data-edit-group]')
  return g ? g.getAttribute('data-edit-group') : 'Page'
}
function labelOf(el, fallback) {
  return el.getAttribute('data-edit-label') || fallback || el.getAttribute('data-edit') || ''
}

function initFromFrame() {
  const doc = frame.contentDocument
  if (!doc) return
  const texts = []
  const initialText = {}
  // Prefer the runtime's pristine baselines (the original static HTML, captured
  // before any overlay applied) so the editor's "reset" target matches exactly
  // what the runtime reverts to. Fall back to the live DOM if unavailable.
  const runtimeBase = (frame.contentWindow && frame.contentWindow.__ndBaselines) || null
  doc.querySelectorAll('[data-edit]').forEach((el) => {
    const key = el.getAttribute('data-edit')
    if (!key) return
    // Normalize the baseline through the SAME sanitizer the field serializer
    // and publish step use, so an untouched field never reads as "changed".
    const raw = runtimeBase && key in runtimeBase.text ? runtimeBase.text[key] : el.innerHTML
    initialText[key] = sanitizeHtml(raw)
    texts.push({ key, label: labelOf(el), group: groupOf(el), el })
  })

  const images = []
  doc.querySelectorAll('[data-edit-img]').forEach((el) => {
    images.push({ key: el.getAttribute('data-edit-img'), type: 'img', label: labelOf(el, 'Image'), group: groupOf(el), el })
  })
  doc.querySelectorAll('[data-edit-bg]').forEach((el) => {
    images.push({ key: el.getAttribute('data-edit-bg'), type: 'bg', label: labelOf(el, 'Background'), group: groupOf(el), el })
  })

  const sections = []
  doc.querySelectorAll('[data-section]').forEach((el) => {
    const key = el.getAttribute('data-section')
    const kids = Array.from(el.children).filter((c) => c.hasAttribute('data-order-id'))
    if (kids.length < 2) return
    const items = kids.map((c) => ({ id: c.getAttribute('data-order-id'), label: labelOf(c, c.getAttribute('data-order-id')) }))
    sections.push({ key, label: labelOf(el, key), items })
  })

  const hideables = []
  doc.querySelectorAll('[data-hideable]').forEach((el) => {
    hideables.push({ key: el.getAttribute('data-hideable'), label: labelOf(el, el.getAttribute('data-hideable')) })
  })

  scan = { texts, images, sections, hideables, initialText }
  injectFrameInteractivity(doc)
  buildContent()
  buildTheme()
  buildArrange()
  buildImages()
  // History is fetched lazily when its tab opens.
}

// Click an element in the preview -> jump to its field. Hover -> outline.
function injectFrameInteractivity(doc) {
  let style = doc.getElementById('nd-editor-style')
  if (!style) {
    style = doc.createElement('style')
    style.id = 'nd-editor-style'
    style.textContent =
      '[data-edit]:hover,[data-edit-img]:hover,[data-edit-bg]:hover{outline:2px dashed rgba(201,168,76,.7)!important;outline-offset:2px;cursor:pointer!important}' +
      '.nd-flash{outline:2px solid #c9a84c!important;outline-offset:2px;transition:outline .2s}'
    doc.head.appendChild(style)
  }
  doc.querySelectorAll('[data-edit],[data-edit-img],[data-edit-bg]').forEach((el) => {
    el.addEventListener('click', (ev) => {
      // Don't follow links while editing.
      if (el.tagName === 'A' || el.closest('a')) ev.preventDefault()
      ev.stopPropagation()
      const key = el.getAttribute('data-edit') || el.getAttribute('data-edit-img') || el.getAttribute('data-edit-bg')
      const isImg = el.hasAttribute('data-edit-img') || el.hasAttribute('data-edit-bg')
      jumpToField(isImg ? 'images' : 'content', key)
    })
  })
}

function jumpToField(tab, key) {
  // On mobile, the preview and editor are separate panes — bring the editor up.
  if (window.matchMedia('(max-width: 760px)').matches) setMobileView('edit')
  switchTab(tab)
  const fld = document.querySelector(`[data-fld="${cssEsc(key)}"]`)
  if (!fld) return
  fld.scrollIntoView({ block: 'center', behavior: 'smooth' })
  fld.classList.add('highlight')
  setTimeout(() => fld.classList.remove('highlight'), 1400)
  const input = fld.querySelector('.rt-input, textarea, input')
  if (input) setTimeout(() => input.focus(), 200)
}

function cssEsc(s) {
  return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&')
}

// ---- Tabs ----------------------------------------------------------------
function switchTab(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name))
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === 'panel-' + name))
  if (name === 'history') buildHistory()
}
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)))

// ---- Help modal ----------------------------------------------------------
const helpBack = $('#help-back')
$('#btn-help').addEventListener('click', () => helpBack.classList.add('show'))
$('#help-close').addEventListener('click', () => helpBack.classList.remove('show'))
helpBack.addEventListener('click', (e) => {
  if (e.target === helpBack) helpBack.classList.remove('show')
})
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') helpBack.classList.remove('show')
})

// ---- Mobile pane toggle (Edit <-> Preview) -------------------------------
document.body.classList.add('view-edit')
function setMobileView(view) {
  document.body.classList.toggle('view-edit', view === 'edit')
  document.body.classList.toggle('view-preview', view === 'preview')
  document.querySelectorAll('#mview button').forEach((b) => b.classList.toggle('active', b.dataset.view === view))
}
$('#mview').addEventListener('click', (e) => {
  const b = e.target.closest('button')
  if (b) setMobileView(b.dataset.view)
})

// ---- Keyboard: Cmd/Ctrl+S = Save Draft -----------------------------------
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    if (appEl.classList.contains('ready') && !btnSave.disabled) btnSave.click()
  }
})

// ---- Viewport controls ---------------------------------------------------
$('#viewport-ctrls').addEventListener('click', (e) => {
  const b = e.target.closest('button')
  if (!b) return
  document.querySelectorAll('#viewport-ctrls button').forEach((x) => x.classList.toggle('active', x === b))
  frame.classList.remove('w-tablet', 'w-mobile')
  if (b.dataset.w === 'tablet') frame.classList.add('w-tablet')
  if (b.dataset.w === 'mobile') frame.classList.add('w-mobile')
})

// ---- CONTENT panel -------------------------------------------------------
function buildContent() {
  const panel = $('#panel-content')
  panel.innerHTML = ''
  if (!scan || scan.texts.length === 0) {
    panel.innerHTML = '<div class="empty">No editable text found on this page yet.</div>'
    return
  }
  const groups = new Map()
  scan.texts.forEach((f) => {
    if (!groups.has(f.group)) groups.set(f.group, [])
    groups.get(f.group).push(f)
  })
  for (const [group, fields] of groups) {
    const gEl = document.createElement('div')
    gEl.className = 'group'
    gEl.innerHTML = `<h3>${escAttr(group)}</h3>`
    fields.forEach((f) => {
      const current = f.key in overlay.text ? overlay.text[f.key] : scan.initialText[f.key]
      const wrap = document.createElement('div')
      wrap.className = 'fld'
      wrap.setAttribute('data-fld', f.key)
      const overridden = f.key in overlay.text
      wrap.innerHTML =
        `<label>${escAttr(f.label)}${overridden ? '<button class="reset" type="button">reset</button>' : '<span></span>'}</label>` +
        `<div class="rt-tools">` +
        `<button type="button" data-cmd="bold" title="Bold (Ctrl/Cmd+B)" style="font-weight:700">B</button>` +
        `<button type="button" data-cmd="italic" title="Italic (Ctrl/Cmd+I)" style="font-style:italic">I</button>` +
        `<button type="button" data-cmd="break" title="Line break">&crarr;</button>` +
        `<button type="button" data-cmd="clear" class="clear" title="Remove all formatting">Clear format</button>` +
        `</div>` +
        `<div class="rt-input" contenteditable="true" role="textbox" aria-multiline="true" aria-label="${escAttr(f.label)}" data-placeholder="Empty"></div>`
      const rt = wrap.querySelector('.rt-input')
      rt.innerHTML = current ?? '' // baseline/overlay values are already sanitized HTML

      const commit = () => {
        const val = sanitizeHtml(serializeRich(rt))
        if (val === scan.initialText[f.key]) delete overlay.text[f.key]
        else overlay.text[f.key] = val
        sendPreview()
        markDirty()
        refreshResetBtn(wrap, f.key, 'text')
      }
      rt.addEventListener('input', commit)
      // Toolbar: keep the caret/selection inside the field, then run the command.
      wrap.querySelectorAll('.rt-tools button').forEach((btn) => {
        btn.addEventListener('mousedown', (e) => e.preventDefault()) // don't steal focus
        btn.addEventListener('click', () => {
          rt.focus()
          const cmd = btn.getAttribute('data-cmd')
          if (cmd === 'bold') document.execCommand('bold')
          else if (cmd === 'italic') document.execCommand('italic')
          else if (cmd === 'break') document.execCommand('insertLineBreak')
          else if (cmd === 'clear') {
            const text = rt.textContent
            rt.textContent = text
          }
          commit()
        })
      })

      const reset = wrap.querySelector('.reset')
      if (reset)
        reset.addEventListener('click', () => {
          delete overlay.text[f.key]
          rt.innerHTML = scan.initialText[f.key] ?? ''
          sendPreview()
          markDirty()
          refreshResetBtn(wrap, f.key, 'text')
        })
      gEl.appendChild(wrap)
    })
    panel.appendChild(gEl)
  }
}

function refreshResetBtn(wrap, key, kind) {
  const has = kind === 'text' ? key in overlay.text : key in overlay.images
  const label = wrap.querySelector('label')
  const existing = label.querySelector('.reset')
  if (has && !existing) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'reset'
    b.textContent = 'reset'
    b.addEventListener('click', () => {
      if (kind === 'text') {
        delete overlay.text[key]
        const rt = wrap.querySelector('.rt-input')
        if (rt) rt.innerHTML = scan.initialText[key] ?? ''
      }
      sendPreview()
      markDirty()
      refreshResetBtn(wrap, key, kind)
    })
    const spacer = label.querySelector('span')
    if (spacer) spacer.replaceWith(b)
    else label.appendChild(b)
  } else if (!has && existing) {
    const s = document.createElement('span')
    existing.replaceWith(s)
  }
}

// Serialize a contenteditable field into the small whitelist of inline tags
// the site allows (strong / em / br). Everything else is unwrapped to its
// text. The result is passed through sanitizeHtml(), so this is convenience
// + normalization, never the security boundary.
function serializeRich(node) {
  let out = ''
  node.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) {
      out += n.nodeValue
    } else if (n.nodeType === Node.ELEMENT_NODE) {
      const tag = n.tagName.toLowerCase()
      if (tag === 'br') out += '<br>'
      else if (tag === 'b' || tag === 'strong') out += '<strong>' + serializeRich(n) + '</strong>'
      else if (tag === 'i' || tag === 'em') out += '<em>' + serializeRich(n) + '</em>'
      else if (tag === 'div' || tag === 'p') {
        if (out && !/<br>$/.test(out)) out += '<br>'
        out += serializeRich(n)
      } else {
        out += serializeRich(n) // unwrap spans/fonts/etc., keep their text
      }
    }
  })
  return out
}

// ---- THEME panel ---------------------------------------------------------
function buildTheme() {
  const panel = $('#panel-theme')
  panel.innerHTML = '<div class="group"><h3>Color Palette</h3><div class="palette-grid" id="pal-grid"></div></div>'
  const grid = $('#pal-grid')
  PALETTES.forEach((p) => {
    const card = document.createElement('button')
    card.type = 'button'
    card.className = 'pal' + (overlay.theme.palette === p.id ? ' active' : '')
    card.dataset.pal = p.id
    card.innerHTML =
      `<div class="swatch">${p.swatch.map((c) => `<i style="background:${escAttr(c)}"></i>`).join('')}</div>` +
      `<div class="pname">${escAttr(p.name)}</div><div class="pdesc">${escAttr(p.description)}</div>`
    card.addEventListener('click', () => {
      overlay.theme.palette = p.id
      grid.querySelectorAll('.pal').forEach((c) => c.classList.toggle('active', c.dataset.pal === p.id))
      sendPreview()
      markDirty()
      buildVarEditors() // refresh shown values to the new palette base
    })
    grid.appendChild(card)
  })

  const adv = document.createElement('div')
  adv.className = 'group'
  adv.innerHTML =
    '<h3>Fine-tune Colors <button class="btn btn--sm btn--ghost" id="reset-vars" type="button" style="float:right;margin-top:-4px">Reset all</button></h3><div id="var-list"></div>'
  panel.appendChild(adv)
  $('#reset-vars').addEventListener('click', () => {
    overlay.theme.vars = {}
    sendPreview()
    markDirty()
    buildVarEditors()
  })
  buildVarEditors()
}

function buildVarEditors() {
  const list = $('#var-list')
  if (!list) return
  list.innerHTML = ''
  const base = getPalette(overlay.theme.palette).vars
  THEME_VARS.forEach((vn) => {
    const cur = vn in overlay.theme.vars ? overlay.theme.vars[vn] : base[vn]
    const row = document.createElement('div')
    row.className = 'var-row'
    const hex6 = /^#[0-9a-fA-F]{6}$/.test(cur)
    row.innerHTML =
      (hex6 ? `<input type="color" value="${escAttr(cur)}">` : `<span style="width:30px;height:30px;border-radius:7px;border:1px solid var(--e-line-strong);background:${escAttr(cur)}"></span>`) +
      `<span class="vname" title="${escAttr(vn)}">${escAttr(labelForVar(vn))}</span>` +
      `<input type="text" value="${escAttr(cur)}" spellcheck="false">` +
      `<button class="vreset" type="button" title="Reset">&times;</button>`
    const colorInput = row.querySelector('input[type=color]')
    const textInput = row.querySelector('input[type=text]')
    const setVar = (val) => {
      const ok = BORDER_VARS.has(vn) ? /^\d{1,2}px\s+(solid|dashed|dotted)\s+/.test(val) : isValidColor(val)
      textInput.classList.toggle('invalid', !ok)
      if (!ok) return
      if (val === base[vn]) delete overlay.theme.vars[vn]
      else overlay.theme.vars[vn] = val
      sendPreview()
      markDirty()
    }
    if (colorInput)
      colorInput.addEventListener('input', () => {
        textInput.value = colorInput.value
        setVar(colorInput.value)
      })
    textInput.addEventListener('input', () => {
      if (colorInput && /^#[0-9a-fA-F]{6}$/.test(textInput.value)) colorInput.value = textInput.value
      setVar(textInput.value.trim())
    })
    row.querySelector('.vreset').addEventListener('click', () => {
      delete overlay.theme.vars[vn]
      sendPreview()
      markDirty()
      buildVarEditors()
    })
    list.appendChild(row)
  })
}

// ---- ARRANGE panel (reorder + hide) --------------------------------------
function buildArrange() {
  const panel = $('#panel-arrange')
  panel.innerHTML = ''
  if (!scan || (scan.sections.length === 0 && scan.hideables.length === 0)) {
    panel.innerHTML = '<div class="empty">Nothing to arrange on this page.</div>'
    return
  }
  if (scan.sections.length) {
    const g = document.createElement('div')
    g.className = 'group'
    g.innerHTML = '<h3>Reorder</h3>'
    scan.sections.forEach((sec) => g.appendChild(buildReorder(sec)))
    panel.appendChild(g)
  }
  if (scan.hideables.length) {
    const g = document.createElement('div')
    g.className = 'group'
    g.innerHTML = '<h3>Show / Hide Sections</h3>'
    scan.hideables.forEach((h) => {
      const row = document.createElement('div')
      row.className = 'toggle-row'
      const visible = overlay.hidden[h.key] !== true
      row.innerHTML =
        `<span class="lbl">${escAttr(h.label)}</span>` +
        `<label class="switch"><input type="checkbox" ${visible ? 'checked' : ''}><span class="track"></span></label>`
      row.querySelector('input').addEventListener('change', (e) => {
        if (e.target.checked) delete overlay.hidden[h.key]
        else overlay.hidden[h.key] = true
        sendPreview()
        markDirty()
      })
      g.appendChild(row)
    })
    panel.appendChild(g)
  }
}

function buildReorder(sec) {
  const box = document.createElement('div')
  box.className = 'arr-section'
  box.innerHTML = `<h4>${escAttr(sec.label)}</h4>`
  const listEl = document.createElement('div')
  box.appendChild(listEl)
  // Working order = saved order applied to scanned items, then any new items.
  const order = currentOrder(sec)
  const byId = new Map(sec.items.map((it) => [it.id, it]))

  const render = () => {
    listEl.innerHTML = ''
    order.forEach((id, idx) => {
      const it = byId.get(id)
      if (!it) return
      const row = document.createElement('div')
      row.className = 'arr-item'
      row.innerHTML =
        `<span class="lbl">${escAttr(it.label)}</span>` +
        `<span class="mv"><button class="up" ${idx === 0 ? 'disabled' : ''}>&uarr;</button>` +
        `<button class="down" ${idx === order.length - 1 ? 'disabled' : ''}>&darr;</button></span>`
      row.querySelector('.up').addEventListener('click', () => move(idx, idx - 1))
      row.querySelector('.down').addEventListener('click', () => move(idx, idx + 1))
      listEl.appendChild(row)
    })
  }
  const move = (from, to) => {
    const next = moveItem(order, from, to)
    order.length = 0
    order.push(...next)
    // Persist only when it differs from the natural DOM order.
    const natural = sec.items.map((i) => i.id)
    if (order.join(',') === natural.join(',')) delete overlay.order[sec.key]
    else overlay.order[sec.key] = order.slice()
    sendPreview()
    markDirty()
    render()
  }
  render()
  return box
}

function currentOrder(sec) {
  const natural = sec.items.map((i) => i.id)
  const saved = overlay.order[sec.key]
  if (!Array.isArray(saved)) return natural.slice()
  const present = new Set(natural)
  const used = new Set()
  const out = []
  saved.forEach((id) => {
    if (present.has(id) && !used.has(id)) {
      out.push(id)
      used.add(id)
    }
  })
  natural.forEach((id) => {
    if (!used.has(id)) out.push(id)
  })
  return out
}

// ---- IMAGES panel --------------------------------------------------------
function buildImages() {
  const panel = $('#panel-images')
  panel.innerHTML = ''
  if (!scan || scan.images.length === 0) {
    panel.innerHTML = '<div class="empty">No editable images on this page.</div>'
    return
  }
  scan.images.forEach((img) => {
    const cur = overlay.images[img.key] || currentImageSrc(img)
    const row = document.createElement('div')
    row.className = 'img-row'
    row.setAttribute('data-fld', img.key)
    row.innerHTML =
      `<div class="ih"><span class="lbl">${escAttr(img.label)}</span><span class="tag">${img.type === 'bg' ? 'Background' : 'Image'}</span></div>` +
      `<div class="thumb">${cur ? '' : 'No image'}</div>` +
      `<div class="iurl"><input type="url" placeholder="Paste image URL (https://…)" value="${escAttr(overlay.images[img.key] || '')}"></div>` +
      `<div class="iact"><button class="btn btn--sm" type="button">Upload</button>` +
      `<input type="file" accept="${ALLOWED_IMG_TYPES.join(',')}" hidden>` +
      `<span class="up-status"></span>` +
      `<span style="flex:1"></span>` +
      `<button class="btn btn--sm btn--ghost reset-img" type="button" ${img.key in overlay.images ? '' : 'disabled'}>Reset</button></div>`
    const thumb = row.querySelector('.thumb')
    if (cur) thumb.style.backgroundImage = `url("${cssUrl(cur)}")`
    const urlInput = row.querySelector('input[type=url]')
    const fileInput = row.querySelector('input[type=file]')
    const status = row.querySelector('.up-status')
    const resetBtn = row.querySelector('.reset-img')

    const apply = (url) => {
      overlay.images[img.key] = url
      thumb.style.backgroundImage = `url("${cssUrl(url)}")`
      thumb.textContent = ''
      resetBtn.disabled = false
      sendPreview()
      markDirty()
    }
    urlInput.addEventListener('input', () => {
      const v = urlInput.value.trim()
      if (v === '') {
        delete overlay.images[img.key]
        urlInput.classList.remove('invalid')
        resetBtn.disabled = !(img.key in overlay.images)
        sendPreview()
        markDirty()
        return
      }
      const ok = isValidImageUrl(v)
      urlInput.classList.toggle('invalid', !ok)
      if (ok) apply(v)
    })
    row.querySelector('.iact .btn').addEventListener('click', () => fileInput.click())
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0]
      if (!file) return
      if (!ALLOWED_IMG_TYPES.includes(file.type)) {
        status.textContent = 'Unsupported type'
        return
      }
      if (file.size > MAX_IMG_BYTES) {
        status.textContent = 'Max 15 MB'
        return
      }
      status.textContent = 'Uploading…'
      try {
        const blob = await blobUpload(file.name, file, { access: 'public', handleUploadUrl: '/api/editor/upload' })
        status.textContent = 'Uploaded ✓'
        urlInput.value = blob.url
        urlInput.classList.remove('invalid')
        apply(blob.url)
        setTimeout(() => (status.textContent = ''), 2000)
      } catch (err) {
        status.textContent = 'Upload failed'
        toast('Image upload failed: ' + (err?.message || err), 'err')
      } finally {
        fileInput.value = ''
      }
    })
    resetBtn.addEventListener('click', () => {
      delete overlay.images[img.key]
      urlInput.value = ''
      urlInput.classList.remove('invalid')
      const base = currentImageSrc(img)
      thumb.style.backgroundImage = base ? `url("${cssUrl(base)}")` : ''
      thumb.textContent = base ? '' : 'No image'
      resetBtn.disabled = true
      sendPreview()
      markDirty()
    })
    panel.appendChild(row)
  })
}

function currentImageSrc(img) {
  try {
    if (img.type === 'img') return img.el.getAttribute('src') || ''
    const bg = frame.contentWindow.getComputedStyle(img.el).backgroundImage
    const m = /url\(["']?(.*?)["']?\)/.exec(bg || '')
    return m ? m[1] : ''
  } catch {
    return ''
  }
}
function cssUrl(u) {
  return String(u).replace(/["\\]/g, '\\$&')
}

// ---- HISTORY panel -------------------------------------------------------
async function buildHistory() {
  const panel = $('#panel-history')
  panel.innerHTML = '<div class="empty">Loading versions…</div>'
  const res = await api('/api/editor/versions')
  if (!res.ok) {
    panel.innerHTML = '<div class="empty">Could not load version history.</div>'
    return
  }
  const versions = res.data?.versions || []
  panel.innerHTML = '<div class="group"><h3>Version History</h3><div id="ver-list"></div></div>'
  const list = $('#ver-list')
  if (versions.length === 0) {
    list.innerHTML = '<div class="empty">No saved versions yet. A snapshot is created each time you publish.</div>'
    return
  }
  versions.forEach((v) => {
    const row = document.createElement('div')
    row.className = 'ver-item'
    const when = v.uploadedAt ? new Date(v.uploadedAt).toLocaleString() : 'Unknown date'
    const size = v.size ? `${(v.size / 1024).toFixed(1)} KB` : ''
    row.innerHTML = `<div class="vmeta"><div class="vwhen">${escAttr(when)}</div><div class="vsize">${escAttr(size)}</div></div>` + `<button class="btn btn--sm" type="button">Restore</button>`
    row.querySelector('button').addEventListener('click', async () => {
      const go = await confirmModal('Restore this version?', 'This replaces your current draft with the selected snapshot. Your live site is not affected until you Publish.', 'Restore')
      if (!go) return
      const r = await api('/api/editor/versions', { method: 'POST', body: { pathname: v.pathname } })
      if (r.ok && r.data?.overlay) {
        overlay = r.data.overlay
        markDirty()
        toast('Version restored into draft', 'ok')
        loadPage(currentPage) // re-render everything from the restored overlay
      } else {
        toast('Restore failed', 'err')
      }
    })
    list.appendChild(row)
  })
}

// ---- Save / Publish ------------------------------------------------------
btnSave.addEventListener('click', async () => {
  btnSave.disabled = true
  const res = await api('/api/editor/save', { method: 'POST', body: overlay })
  if (res.ok && res.data?.overlay) {
    overlay = res.data.overlay // adopt the server-sanitized version
    snapshotSaved()
    toast('Draft saved', 'ok')
  } else {
    toast('Save failed', 'err')
    markDirty()
  }
})

btnPublish.addEventListener('click', async () => {
  const dirty = JSON.stringify(overlay) !== savedJson
  const go = await confirmModal(
    'Publish to the live site?',
    dirty
      ? 'This saves your current draft and makes it live for all visitors. A snapshot of the previous live version is kept so you can revert.'
      : 'This makes your current draft live for all visitors. A snapshot of the previous live version is kept so you can revert.',
    'Publish now'
  )
  if (!go) return
  btnPublish.disabled = true
  const res = await api('/api/editor/publish', { method: 'POST', body: overlay })
  btnPublish.disabled = false
  if (res.ok && res.data?.overlay) {
    overlay = res.data.overlay
    snapshotSaved()
    toast('Published — your site is live ✓', 'ok')
  } else {
    toast('Publish failed', 'err')
  }
})

// ---- utils ---------------------------------------------------------------
function escAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

boot()
