// Usage segments: token counts, remaining %, duration, cost, and the Pro/Max
// rate-limit windows. Each hides when its source field is null/absent.
import { formatDuration, formatCountdown, formatTokens } from '../format.js'
import { optionDefaults } from './options.js'

export const tokens = {
  id: 'tokens', section: 'usage',
  // Current tokens in context = total_input + total_output (the canonical
  // context counts). Null before the first API call / post-/compact → hide.
  isAvailable: (input) =>
    input?.context_window?.total_input_tokens != null || input?.context_window?.total_output_tokens != null,
  format: (input, theme) => {
    const cw = input.context_window
    const glyph = theme.glyph('tokens')
    const n = formatTokens((Number(cw.total_input_tokens) || 0) + (Number(cw.total_output_tokens) || 0))
    // Yellow is the tokens field's identity hue — it does not vary with the
    // count. There is no "too many tokens" threshold to warn about here (the
    // context gauge already owns that signal), so this is a label, not a gauge.
    return `${glyph ? glyph + ' ' : ''}${theme.color('yellow', n)}`
  },
}

export const remaining = {
  id: 'remaining', section: 'usage',
  isAvailable: (input) => input?.context_window?.remaining_percentage != null,
  format: (input, theme) => theme.primary(`${Math.round(input.context_window.remaining_percentage)}% left`),
}

export const duration = {
  id: 'duration', section: 'usage',
  isAvailable: (input) => input?.cost?.total_duration_ms != null,
  format: (input, theme) => `${theme.glyph('duration') ? theme.glyph('duration') + ' ' : ''}${theme.primary(formatDuration(input.cost.total_duration_ms))}`,
}

export const cost = {
  id: 'cost', section: 'usage',
  isAvailable: (input) => input?.cost?.total_cost_usd != null,
  format: (input, theme) => theme.primary(`$${Number(input.cost.total_cost_usd).toFixed(2)}`),
}

// The two independent toggles' defaults now live in the segment-options registry
// (segments/options.js: fiveHour = time-only, weekly = time + percent), so config,
// the TUI, and this format share one source of truth.

// The countdown is GREEN, always — it has no urgency ramp, and that is the point.
//
// It counts down to the moment your quota RESETS, so a small number is good news,
// not bad. The old ramp (neutral → yellow → orange as the reset neared) inverted
// that: it painted approaching relief as approaching danger. The urgency signal
// for this window already exists and lives next door — `used_percentage`, which
// keeps its green/yellow/red ramp below. So the countdown is free to be a calm,
// stable field marker, and green is its identity hue.

// Percent tone, by USAGE — the same green/yellow/red thresholds the context bar
// uses, so one mental model (green plenty → red nearly full) spans the line. This
// is the only place in the rate-limit window where colour means "state".
const usageTone = (pct) => (pct >= 90 ? 'red' : pct >= 70 ? 'yellow' : 'green')

// Rate-limit windows (Pro/Max only, and absent until the first API response).
// One segment renders up to two independently-toggled parts — countdown and
// used-% — so the layout engine never places a separator *inside* a window
// (percent and time cannot be separate segments: layout.js joins segments with
// its own `│`). Each part also hides when its own source is null, so we never
// fabricate a 0% or a NaN countdown. Both parts off, or both sources null → ''
// → render() treats it as hidden, leaving no stray separator.
function limit(id, key) {
  // Session wears the ⧗ sand-timer, or `S` when the glyph resolves empty (ascii
  // mode OR icons-off), so a bare countdown is never anonymous. Weekly wears a
  // literal `wk` — a label, not a glyph, so it survives every mode.
  const marker = (theme) => (id === 'weekly' ? 'wk' : theme.glyph('reset') || 'S')
  return {
    id, section: 'usage',
    isAvailable: (input) => {
      const rl = input?.rate_limits?.[key]
      return rl != null && (rl.used_percentage != null || rl.resets_at != null)
    },
    format: (input, theme, entry) => {
      const rl = input.rate_limits[key]
      const d = optionDefaults(id)
      const showTime = entry?.showTime ?? d.showTime
      const showPercent = entry?.showPercent ?? d.showPercent
      const parts = []
      if (showTime && rl.resets_at != null) {
        // resets_at is Unix epoch SECONDS; input.now is Date.now() ms → convert before diffing.
        const ms = rl.resets_at * 1000 - input.now
        parts.push(theme.color('green', formatCountdown(ms)))
      }
      if (showPercent && rl.used_percentage != null) {
        const pct = Math.round(rl.used_percentage)
        parts.push(theme.color(usageTone(pct), `${pct}%`))
      }
      if (parts.length === 0) return ''
      // The marker takes the countdown's green so the timer reads as one object
      // (glyph + digits), exactly as the reference line drew it. `wk` is a word,
      // not a value, so it stays chrome-dim.
      const m = marker(theme)
      const head = id === 'weekly' ? theme.secondary(m) : theme.color('green', m)
      // The ` · ` between parts is chrome, not state, so it's dimmed like the
      // other separators — otherwise it sits outside every SGR and glares white
      // on a dark theme while its neighbours recede. (Plain when colors are off.)
      return `${head} ${parts.join(theme.color('dim', ' · '))}`
    },
  }
}

export const fiveHour = limit('fiveHour', 'five_hour')
export const weekly = limit('weekly', 'seven_day')
