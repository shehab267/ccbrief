// Usage segments: token counts, remaining %, duration, cost, and the Pro/Max
// rate-limit windows. Each hides when its source field is null/absent.
import { formatDuration, formatCountdown, formatTokens, sumTokens } from '../format.js'

export const tokens = {
  id: 'tokens', section: 'usage',
  isAvailable: (input) => input?.context_window?.current_usage != null,
  format: (input) => formatTokens(sumTokens(input.context_window.current_usage)),
}

export const remaining = {
  id: 'remaining', section: 'usage',
  isAvailable: (input) => input?.context_window?.remaining_percentage != null,
  format: (input) => `${Math.round(input.context_window.remaining_percentage)}% left`,
}

export const duration = {
  id: 'duration', section: 'usage',
  isAvailable: (input) => input?.cost?.total_duration_ms != null,
  format: (input, theme) => `${theme.glyph('duration') ? theme.glyph('duration') + ' ' : ''}${formatDuration(input.cost.total_duration_ms)}`,
}

export const cost = {
  id: 'cost', section: 'usage',
  isAvailable: (input) => input?.cost?.total_cost_usd != null,
  format: (input) => `$${Number(input.cost.total_cost_usd).toFixed(2)}`,
}

// Rate-limit windows (Pro/Max only). Countdown is computed locally from
// input.now each render; a passed reset shows `reset due`, never 0%.
function limit(label, key) {
  return {
    id: key === 'five_hour' ? 'fiveHour' : 'weekly', section: 'usage',
    isAvailable: (input) => input?.rate_limits?.[key]?.used_percentage != null,
    format: (input) => {
      const rl = input.rate_limits[key]
      const pct = Math.round(rl.used_percentage)
      // resets_at is Unix epoch SECONDS; input.now is Date.now() ms → convert before diffing.
      const tail = rl.resets_at != null ? ` · ${formatCountdown(rl.resets_at * 1000 - input.now)}` : ''
      return `${label} ${pct}%${tail}`
    },
  }
}

export const fiveHour = limit('5h', 'five_hour')
export const weekly = limit('7d', 'seven_day')
