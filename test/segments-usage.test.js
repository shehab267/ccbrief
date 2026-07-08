import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BY_ID } from '../src/segments/index.js'
import { makeTheme } from '../src/theme.js'

const plain = makeTheme({ glyphs: 'ascii', colors: false, icons: false })
const show = (id, input) => (BY_ID[id].isAvailable(input) ? BY_ID[id].format(input, plain) : null)
const NOW = 1_760_000_000_000

const rows = [
  ['tokens sum', 'tokens', { context_window: { current_usage: { input_tokens: 90_000, output_tokens: 12_000, cache_read_input_tokens: 26_000 } } }, '128k'],
  ['tokens hidden post-compact', 'tokens', { context_window: { current_usage: null } }, null],
  ['remaining', 'remaining', { context_window: { remaining_percentage: 58 } }, '58% left'],
  ['remaining hidden', 'remaining', { context_window: { remaining_percentage: null } }, null],
  ['duration', 'duration', { cost: { total_duration_ms: 5_040_000 } }, '1h 24m'],
  ['duration hidden', 'duration', { cost: {} }, null],
  ['cost', 'cost', { cost: { total_cost_usd: 1.23 } }, '$1.23'],
  ['cost hidden', 'cost', { cost: {} }, null],
  // resets_at is Unix epoch SECONDS (official contract); input.now is Date.now() ms.
  ['5h with countdown', 'fiveHour', { now: NOW, rate_limits: { five_hour: { used_percentage: 40, resets_at: NOW / 1000 + 2 * 3600 } } }, '5h 40% · 2h 0m'],
  ['weekly reset passed → reset due', 'weekly', { now: NOW, rate_limits: { seven_day: { used_percentage: 12, resets_at: NOW / 1000 - 60 } } }, '7d 12% · reset due'],
  ['5h hidden when rate_limits absent', 'fiveHour', { now: NOW, rate_limits: null }, null],
]

for (const [name, id, input, expected] of rows) {
  test(`usage: ${name}`, () => assert.equal(show(id, input), expected))
}
