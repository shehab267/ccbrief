// PURE TUI state model: initialState / reduce / stateToConfig. The keypress loop
// (tui/index.js) is the only impure part; all state transitions live here so
// they're deterministic and unit-tested.
import { segmentsOf } from '../config.js'
import { SEGMENTS, optionsFor, optionDefaults } from '../segments/index.js'

// The picker's list is the WHOLE catalog — every segment ccbrief ships, not just the
// ones the current preset happens to name.
//
// It used to be the latter, which made the picker a tool that could only SUBTRACT:
// five segments (pr, worktree, thinking, outputStyle, agent) sit in no preset, so the
// only way to switch one on was to hand-write JSON — and you had to already know it
// existed to go looking for it. A picker you cannot add from is a list, not a picker.
//
// Configured segments keep their position and their toggles; the rest are appended in
// catalog order, switched off. The rows then read top-down as "what's on, in the order
// it renders", followed by "what else you could have".
function catalog(configured = []) {
  const chosen = new Map(configured.filter((s) => s?.id).map((s) => [s.id, { ...s }]))
  const rest = SEGMENTS
    .filter((s) => !chosen.has(s.id))
    .map((s) => ({ id: s.id, enabled: false, ...optionDefaults(s.id) }))
  return [...chosen.values(), ...rest]
}

export function initialState(config) {
  return { ...config, segments: catalog(config.segments) }
}

// Any manual edit means the config no longer matches a named preset.
const toCustom = (s) => (s.preset === 'custom' ? s.preset : 'custom')

export function reduce(state, action) {
  switch (action.type) {
    case 'toggle': {
      const segments = state.segments.map((s) => (s.id === action.id ? { ...s, enabled: !s.enabled } : s))
      return { ...state, segments, preset: toCustom(state) }
    }
    case 'move': {
      const i = state.segments.findIndex((s) => s.id === action.id)
      const j = i + action.dir
      if (i < 0 || j < 0 || j >= state.segments.length) return state
      const segments = state.segments.slice()
      ;[segments[i], segments[j]] = [segments[j], segments[i]]
      return { ...state, segments, preset: toCustom(state) }
    }
    case 'preset': {
      if (action.preset === 'custom') return { ...state, preset: 'custom' }
      // `p` is a clean reset to that preset — its segments on, in its own order, and
      // the rest of the catalog re-appended off. segmentsOf() carries each segment's
      // declared toggle defaults, so switching presets never strips them.
      return { ...state, preset: action.preset, segments: catalog(segmentsOf(action.preset)) }
    }
    case 'setOption': {
      const segments = state.segments.map((s) => (s.id === action.id ? { ...s, [action.key]: action.value } : s))
      return { ...state, segments, preset: toCustom(state) }
    }
    case 'set':
      return { ...state, [action.key]: action.value, preset: toCustom(state) }
    default:
      return state
  }
}

// The config this state stands for. It always carries the FULL segment list, because
// render() is fed straight from here for the live preview and reads `enabled` off each
// entry — a trimmed list would blank the preview. What gets written to disk is a
// separate question, answered in saveConfig.
export function stateToConfig(state) {
  return {
    version: 1,
    preset: state.preset,
    layout: state.layout,
    maxRows: state.maxRows,
    symbols: state.symbols,
    colors: state.colors,
    icons: state.icons,
    segments: state.segments.map((s) => {
      // Preserve each segment's declared toggles; segments that declare none carry
      // nothing, so the round-trip stays exact (loadConfig re-derives the identical
      // entry via the same registry).
      const entry = { id: s.id, enabled: s.enabled }
      for (const o of optionsFor(s.id)) {
        if (typeof s[o.key] === 'boolean') entry[o.key] = s[o.key]
      }
      return entry
    }),
  }
}

// What actually lands in config.json.
//
// A named preset derives its segments on load, so writing the list too would leave
// fifteen inert entries in the file that look editable and aren't. Only `custom` owns
// a segment list; a preset owns nothing but its name. (JSON.stringify drops the
// undefined key, so this is the whole trick.)
export function configToFile(config) {
  return config.preset === 'custom' ? config : { ...config, segments: undefined }
}
