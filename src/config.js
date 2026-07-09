// Config schema: defaults, presets, and a forward-compatible loader. Unknown or
// invalid fields fall back to defaults so a hand-edited or future config never
// crashes the renderer.
import { BY_ID } from './segments/index.js'

export const PRESETS = {
  minimal: ['repo', 'context', 'model'],
  standard: ['repo', 'context', 'duration', 'model'],
  detailed: ['directory', 'repo', 'lines', 'context', 'tokens', 'duration', 'cost', 'fiveHour', 'weekly', 'effort', 'model'],
}

export const DEFAULT_CONFIG = {
  version: 1,
  preset: 'standard',
  layout: 'auto',
  maxRows: 3,
  glyphs: 'emoji',
  colors: true,
  icons: true,
  segments: PRESETS.standard.map((id) => ({ id, enabled: true })),
}

const GLYPHS = new Set(['emoji', 'nerd-font', 'ascii'])
const LAYOUTS = new Set(['auto', 'single-line', 'multi-line'])
const PRESET_NAMES = new Set(['minimal', 'standard', 'detailed', 'custom'])
// Segments whose value changes over time → they drive refreshInterval.
const TIME_BASED = new Set(['duration', 'fiveHour', 'weekly'])

const oneOf = (v, set, fallback) => (set.has(v) ? v : fallback)

export function loadConfig(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const preset = oneOf(r.preset, PRESET_NAMES, 'standard')
  const glyphs = oneOf(r.glyphs, GLYPHS, 'emoji')
  const layout = oneOf(r.layout, LAYOUTS, 'auto')
  const maxRows = Math.min(3, Math.max(1, Number.isFinite(r.maxRows) ? Math.trunc(r.maxRows) : 3))
  const colors = typeof r.colors === 'boolean' ? r.colors : true
  const icons = typeof r.icons === 'boolean' ? r.icons : true

  let segments
  if (preset === 'custom') {
    const provided = Array.isArray(r.segments) ? r.segments : DEFAULT_CONFIG.segments
    segments = provided
      .filter((s) => s && BY_ID[s.id])
      .map((s) => ({ id: s.id, enabled: s.enabled !== false }))
  } else {
    // A named preset derives its segment list; stray `segments` are ignored.
    segments = PRESETS[preset].map((id) => ({ id, enabled: true }))
  }
  return { version: 1, preset, layout, maxRows, glyphs, colors, icons, segments }
}

// 60s only when a time-based segment is enabled; otherwise omit refreshInterval
// and rely on event-driven updates.
export function refreshIntervalFor(config) {
  return config.segments.some((s) => s.enabled && TIME_BASED.has(s.id)) ? 60 : undefined
}
