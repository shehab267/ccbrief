// Config schema: defaults, presets, and a forward-compatible loader. Unknown or
// invalid fields fall back to defaults so a hand-edited or future config never
// crashes the renderer.
import { BY_ID, optionsFor } from './segments/index.js'

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

// A segment entry is { id, enabled }, plus whatever show/hide toggles that segment
// declares in the options registry (repo → showDiff; the rate-limit windows →
// showTime/showPercent). withOptions attaches ONLY those declared keys, keeping
// valid provided values and dropping every other key — so a hand-edited config
// can't smuggle unknown fields through, and a segment never carries a toggle it
// would ignore (which would also break render.test.js's exact matches and the
// TUI's stateToConfig↔loadConfig round-trip). Because every toggle defaults to
// its current on-screen behaviour, adding one changes no rendered output.
function withOptions(id, src = {}) {
  const entry = { id, enabled: src.enabled !== false }
  for (const o of optionsFor(id)) {
    entry[o.key] = typeof src[o.key] === 'boolean' ? src[o.key] : o.default
  }
  return entry
}

export const DEFAULT_CONFIG = {
  version: 1,
  preset: 'standard',
  layout: 'auto',
  maxRows: 3,
  glyphs: 'simple',
  colors: true,
  icons: true,
  segments: PRESETS.standard.map((id) => withOptions(id)),
}

// `simple` is the default and the safe fallback: the only glyph mode identical
// for every user (text + universal symbols), so an unknown/legacy value degrades
// to something that renders everywhere rather than to emoji (which varies).
const GLYPHS = new Set(['simple', 'emoji', 'nerd-font', 'ascii'])
const LAYOUTS = new Set(['auto', 'single-line', 'multi-line'])
const PRESET_NAMES = new Set(['minimal', 'standard', 'detailed', 'custom'])
// Segments whose value changes over time → they drive refreshInterval.
const TIME_BASED = new Set(['duration', 'fiveHour', 'weekly'])

const oneOf = (v, set, fallback) => (set.has(v) ? v : fallback)

export function loadConfig(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const preset = oneOf(r.preset, PRESET_NAMES, 'standard')
  const glyphs = oneOf(r.glyphs, GLYPHS, 'simple')
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
