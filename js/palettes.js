// ============================================================
// A NEW DAWN — Color Palettes
// Single source of truth for the 6 site-wide themes.
// Each palette is a complete map of the themeable CSS custom
// properties defined in css/style.css :root.
// Shared by: runtime overlay loader, the editor, and node tests.
// Pure data + helpers only — no DOM, no side effects on import.
// ============================================================

// The exact set of CSS variables a palette is allowed to set.
// Anything outside this list is rejected by the validator (security).
export const THEME_VARS = [
  '--deep-earth',
  '--forest',
  '--forest-mist',
  '--canopy',
  '--sacred-gold',
  '--gold-light',
  '--gold-glow',
  '--dawn-rose',
  '--dawn-blush',
  '--warm-white',
  '--soft-cream',
  '--muted-text',
  '--overlay-dark',
  '--overlay-medium',
  '--border-subtle',
  '--border-glow',
]

// Each palette: { id, name, description, swatch:[3 hex for the picker], vars:{...} }
// `vars` MUST only contain keys from THEME_VARS.
export const PALETTES = [
  {
    id: 'sacred-earth',
    name: 'Sacred Earth',
    description: 'Deep forest at dawn — golden light through the canopy. (Original)',
    swatch: ['#0b1a0b', '#c9a84c', '#c47a6e'],
    vars: {
      '--deep-earth': '#0b1a0b',
      '--forest': '#132613',
      '--forest-mist': '#1e3a2a',
      '--canopy': '#2a4f3a',
      '--sacred-gold': '#c9a84c',
      '--gold-light': '#e4cc7a',
      '--gold-glow': 'rgba(201, 168, 76, 0.15)',
      '--dawn-rose': '#c47a6e',
      '--dawn-blush': '#d4967a',
      '--warm-white': '#f5f0e6',
      '--soft-cream': '#ede6d6',
      '--muted-text': '#a89f8f',
      '--overlay-dark': 'rgba(11, 26, 11, 0.75)',
      '--overlay-medium': 'rgba(11, 26, 11, 0.5)',
      '--border-subtle': '1px solid rgba(201, 168, 76, 0.15)',
      '--border-glow': '1px solid rgba(201, 168, 76, 0.3)',
    },
  },
  {
    id: 'midnight-amethyst',
    name: 'Midnight Amethyst',
    description: 'Deep indigo night sky lit by soft amethyst and silver.',
    swatch: ['#0e0b1a', '#b89cdb', '#e0b3c8'],
    vars: {
      '--deep-earth': '#0e0b1a',
      '--forest': '#181030',
      '--forest-mist': '#271b45',
      '--canopy': '#382a5e',
      '--sacred-gold': '#b89cdb',
      '--gold-light': '#d6c4ef',
      '--gold-glow': 'rgba(184, 156, 219, 0.16)',
      '--dawn-rose': '#e0b3c8',
      '--dawn-blush': '#ecc8d8',
      '--warm-white': '#f1ecf7',
      '--soft-cream': '#e3dcef',
      '--muted-text': '#9b91b3',
      '--overlay-dark': 'rgba(14, 11, 26, 0.78)',
      '--overlay-medium': 'rgba(14, 11, 26, 0.5)',
      '--border-subtle': '1px solid rgba(184, 156, 219, 0.16)',
      '--border-glow': '1px solid rgba(184, 156, 219, 0.32)',
    },
  },
  {
    id: 'rose-quartz-dawn',
    name: 'Rose Quartz Dawn',
    description: 'Warm mauve twilight with rose-gold and blush light.',
    swatch: ['#1c0f14', '#d9a36b', '#e69a86'],
    vars: {
      '--deep-earth': '#1c0f14',
      '--forest': '#2a1820',
      '--forest-mist': '#3d2530',
      '--canopy': '#553544',
      '--sacred-gold': '#d9a36b',
      '--gold-light': '#f0c79a',
      '--gold-glow': 'rgba(217, 163, 107, 0.16)',
      '--dawn-rose': '#e69a86',
      '--dawn-blush': '#f0b3a3',
      '--warm-white': '#f7ede9',
      '--soft-cream': '#efe0db',
      '--muted-text': '#b39a92',
      '--overlay-dark': 'rgba(28, 15, 20, 0.78)',
      '--overlay-medium': 'rgba(28, 15, 20, 0.5)',
      '--border-subtle': '1px solid rgba(217, 163, 107, 0.16)',
      '--border-glow': '1px solid rgba(217, 163, 107, 0.32)',
    },
  },
  {
    id: 'ocean-depths',
    name: 'Ocean Depths',
    description: 'Deep teal waters touched by warm gold and seafoam.',
    swatch: ['#06161a', '#e0bd72', '#7ec6b8'],
    vars: {
      '--deep-earth': '#06161a',
      '--forest': '#0c2329',
      '--forest-mist': '#15383f',
      '--canopy': '#1e515a',
      '--sacred-gold': '#e0bd72',
      '--gold-light': '#f0d79a',
      '--gold-glow': 'rgba(224, 189, 114, 0.15)',
      '--dawn-rose': '#7ec6b8',
      '--dawn-blush': '#9cd6c9',
      '--warm-white': '#eef4f3',
      '--soft-cream': '#dce8e6',
      '--muted-text': '#8fa3a1',
      '--overlay-dark': 'rgba(6, 22, 26, 0.78)',
      '--overlay-medium': 'rgba(6, 22, 26, 0.5)',
      '--border-subtle': '1px solid rgba(224, 189, 114, 0.15)',
      '--border-glow': '1px solid rgba(224, 189, 114, 0.3)',
    },
  },
  {
    id: 'desert-bloom',
    name: 'Desert Bloom',
    description: 'Warm terracotta canyon with amber light and coral bloom.',
    swatch: ['#1a0e08', '#e0a043', '#e07a5f'],
    vars: {
      '--deep-earth': '#1a0e08',
      '--forest': '#281710',
      '--forest-mist': '#3d251a',
      '--canopy': '#583626',
      '--sacred-gold': '#e0a043',
      '--gold-light': '#f0c074',
      '--gold-glow': 'rgba(224, 160, 67, 0.16)',
      '--dawn-rose': '#e07a5f',
      '--dawn-blush': '#ec9882',
      '--warm-white': '#f7efe6',
      '--soft-cream': '#efe2d3',
      '--muted-text': '#b39c87',
      '--overlay-dark': 'rgba(26, 14, 8, 0.78)',
      '--overlay-medium': 'rgba(26, 14, 8, 0.5)',
      '--border-subtle': '1px solid rgba(224, 160, 67, 0.16)',
      '--border-glow': '1px solid rgba(224, 160, 67, 0.32)',
    },
  },
  {
    id: 'moonlit-sage',
    name: 'Moonlit Sage',
    description: 'Cool charcoal-sage under pale silver-gold moonlight.',
    swatch: ['#101512', '#cdb98a', '#a7c0a3'],
    vars: {
      '--deep-earth': '#101512',
      '--forest': '#1a221d',
      '--forest-mist': '#28332b',
      '--canopy': '#3a4a3e',
      '--sacred-gold': '#cdb98a',
      '--gold-light': '#e4d6b3',
      '--gold-glow': 'rgba(205, 185, 138, 0.15)',
      '--dawn-rose': '#a7c0a3',
      '--dawn-blush': '#c0d4bc',
      '--warm-white': '#f0f2ed',
      '--soft-cream': '#e0e5db',
      '--muted-text': '#9aa39a',
      '--overlay-dark': 'rgba(16, 21, 18, 0.78)',
      '--overlay-medium': 'rgba(16, 21, 18, 0.5)',
      '--border-subtle': '1px solid rgba(205, 185, 138, 0.15)',
      '--border-glow': '1px solid rgba(205, 185, 138, 0.3)',
    },
  },
  {
    id: 'vibrant-dawn',
    name: 'Vibrant Dawn',
    description: 'Deep sunrise-sky blue with vivid gold, coral and blush — the hero photo as a whole color scheme.',
    swatch: ['#101a2c', '#f0b45a', '#ef8f7c'],
    vars: {
      '--deep-earth': '#101a2c',
      '--forest': '#16233c',
      '--forest-mist': '#243a54',
      '--canopy': '#2e4a66',
      '--sacred-gold': '#f0b45a',
      '--gold-light': '#ffd98a',
      '--gold-glow': 'rgba(240, 180, 90, 0.18)',
      '--dawn-rose': '#ef8f7c',
      '--dawn-blush': '#f6ad92',
      '--warm-white': '#fdf6ea',
      '--soft-cream': '#f4e9d8',
      '--muted-text': '#a9b0c0',
      '--overlay-dark': 'rgba(16, 26, 44, 0.75)',
      '--overlay-medium': 'rgba(16, 26, 44, 0.5)',
      '--border-subtle': '1px solid rgba(240, 180, 90, 0.18)',
      '--border-glow': '1px solid rgba(240, 180, 90, 0.35)',
    },
  },
]

export const DEFAULT_PALETTE_ID = 'sacred-earth'

const _byId = new Map(PALETTES.map((p) => [p.id, p]))

export function getPalette(id) {
  return _byId.get(id) || _byId.get(DEFAULT_PALETTE_ID)
}

export function isPaletteId(id) {
  return _byId.has(id)
}
