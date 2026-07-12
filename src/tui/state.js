// PURE TUI state model: initialState / reduce / stateToConfig. The keypress loop
// (tui/index.js) is the only impure part; all state transitions live here so
// they're deterministic and unit-tested.
import { PRESETS } from '../config.js'
import { optionsFor, optionDefaults } from '../segments/index.js'

export function initialState(config) {
  return { ...config, segments: config.segments.map((s) => ({ ...s })) }
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
      // Re-inject each segment's declared toggle defaults so switching presets
      // doesn't strip them (they'd otherwise vanish until the next config reload).
      const segments = PRESETS[action.preset].map((id) => ({ id, enabled: true, ...optionDefaults(id) }))
      return { ...state, preset: action.preset, segments }
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

export function stateToConfig(state) {
  return {
    version: 1,
    preset: state.preset,
    layout: state.layout,
    maxRows: state.maxRows,
    glyphs: state.glyphs,
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
