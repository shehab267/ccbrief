// Config schema: defaults, presets, and a forward-compatible loader. Unknown or
// invalid fields fall back to defaults so a hand-edited or future config never
// crashes the renderer.
import { BY_ID, LIMIT_DEFAULTS } from './segments/index.js'

export const PRESETS = {
  minimal: ['repo', 'context', 'model'],
  // standard leads with the 5-hour window instead of the session clock: two
  // clocks side by side was the exact confusion the limits redesign removed, and
  // `duration` stays one keystroke away in the TUI. Pro/Max-first by design — on
  // the free tier (and the first render of any session, before rate_limits
  // arrives) this slot is simply empty rather than a second, unrelated timer.
  standard: ['repo', 'context', 'fiveHour', 'model'],
  detailed: ['directory', 'repo', 'lines', 'context', 'tokens', 'cost', 'fiveHour', 'weekly', 'effort', 'model'],
}

// A segment entry is { id, enabled }, plus two toggles for the rate-limit
// windows. withOptions attaches showTime/showPercent ONLY to segments that have
// defaults (the limit windows), keeping valid provided values and dropping every
// other key — so a hand-edited config can't smuggle unknown fields through, and
// non-limit segments never carry toggles they'd ignore (which would also break
// render.test.js's exact matches and the TUI's stateToConfig↔loadConfig round-trip).
function withOptions(id, src = {}) {
  const entry = { id, enabled: src.enabled !== false }
  const d = LIMIT_DEFAULTS[id]
  if (d) {
    entry.showTime = typeof src.showTime === 'boolean' ? src.showTime : d.showTime
    entry.showPercent = typeof src.showPercent === 'boolean' ? src.showPercent : d.showPercent
  }
  return entry
}

export const DEFAULT_CONFIG = {
  version: 1,
  preset: 'standard',
  layout: 'auto',
  maxRows: 3,
  glyphs: 'emoji',
  colors: true,
  icons: true,
  segments: PRESETS.standard.map((id) => withOptions(id)),
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
      .map((s) => withOptions(s.id, s))
  } else {
    // A named preset derives its segment list (with its option defaults); stray
    // `segments` are ignored.
    segments = PRESETS[preset].map((id) => withOptions(id))
  }
  return { version: 1, preset, layout, maxRows, glyphs, colors, icons, segments }
}

// 60s only when a time-based segment is enabled; otherwise omit refreshInterval
// and rely on event-driven updates.
export function refreshIntervalFor(config) {
  return config.segments.some((s) => s.enabled && TIME_BASED.has(s.id)) ? 60 : undefined
}
