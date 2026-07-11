// Usage segments: token counts, remaining %, duration, cost, and the Pro/Max
// rate-limit windows. Each hides when its source field is null/absent.
import { formatDuration, formatCountdown, formatTokens } from '../format.js'

export const tokens = {
  id: 'tokens', section: 'usage',
  // Current tokens in context = total_input + total_output (the canonical
  // context counts). Null before the first API call / post-/compact → hide.
  isAvailable: (input) =>
    input?.context_window?.total_input_tokens != null || input?.context_window?.total_output_tokens != null,
  format: (input, theme) => {
    const cw = input.context_window
    return theme.secondary(formatTokens((Number(cw.total_input_tokens) || 0) + (Number(cw.total_output_tokens) || 0)))
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
  format: (input, theme) => `${theme.glyph('duration') ? theme.glyph('duration') + ' ' : ''}${theme.secondary(formatDuration(input.cost.total_duration_ms))}`,
}

export const cost = {
  id: 'cost', section: 'usage',
  isAvailable: (input) => input?.cost?.total_cost_usd != null,
  format: (input, theme) => theme.secondary(`$${Number(input.cost.total_cost_usd).toFixed(2)}`),
}

// Per-window defaults for the two independent toggles. Session shows time only —
// the 5-hour countdown is the number checked most, and the line stays compact;
// its percent is one keystroke away in the TUI. Weekly shows both, because a
// multi-day countdown alone says little about how much quota is left. Exported
// so config.js can inject these when a preset derives its segment list.
export const LIMIT_DEFAULTS = {
  fiveHour: { showTime: true, showPercent: false },
  weekly: { showTime: true, showPercent: true },
}

// Countdown tone, by TIME REMAINING — and deliberately only two warm steps.
// Neutral (no colour) while the reset is far off, yellow inside 90 min, orange
// inside 45 min. It never goes red: red means "you're about to run out", but an
// imminent reset is the opposite — relief. A passed reset (`reset due`) also
// stays neutral, since per the investigation that state is usually a stale
// post-/clear snapshot, not an emergency.
function resetTone(ms) {
  if (ms <= 0) return null // reset due → neutral, never an alarm colour
  const min = ms / 60_000
  if (min <= 45) return 'orange'
  if (min <= 90) return 'yellow'
  return null // far off → calm
}

// Percent tone, by USAGE — the same green/yellow/red thresholds the context
// gauge uses, so one mental model (green plenty → red nearly full) spans the line.
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
      const d = LIMIT_DEFAULTS[id]
      const showTime = entry?.showTime ?? d.showTime
      const showPercent = entry?.showPercent ?? d.showPercent
      const parts = []
      if (showTime && rl.resets_at != null) {
        // resets_at is Unix epoch SECONDS; input.now is Date.now() ms → convert before diffing.
        const ms = rl.resets_at * 1000 - input.now
        const tone = resetTone(ms)
        // Neutral (far off / reset due) is identity-toned; only the warm steps take colour.
        parts.push(tone ? theme.color(tone, formatCountdown(ms)) : theme.primary(formatCountdown(ms)))
      }
      if (showPercent && rl.used_percentage != null) {
        const pct = Math.round(rl.used_percentage)
        parts.push(theme.color(usageTone(pct), `${pct}%`))
      }
      if (parts.length === 0) return ''
      // The ` · ` between parts is chrome, not state, so it's dimmed like the
      // other separators — otherwise it sits outside every SGR and glares white
      // on a dark theme while its neighbours recede. (Plain when colors are off.)
      return `${theme.secondary(marker(theme))} ${parts.join(theme.color('dim', ' · '))}`
    },
  }
}

export const fiveHour = limit('fiveHour', 'five_hour')
export const weekly = limit('weekly', 'seven_day')
