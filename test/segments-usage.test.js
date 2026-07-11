import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BY_ID } from '../src/segments/index.js'
import { makeTheme } from '../src/theme.js'

const plain = makeTheme({ glyphs: 'ascii', colors: false, icons: false })
const show = (id, input) => (BY_ID[id].isAvailable(input) ? BY_ID[id].format(input, plain) : null)
const NOW = 1_760_000_000_000

const rows = [
  ['tokens = total_input + total_output', 'tokens', { context_window: { total_input_tokens: 116_000, total_output_tokens: 12_000 } }, '128k'],
  ['tokens hidden when totals absent', 'tokens', { context_window: { total_input_tokens: null, total_output_tokens: null } }, null],
  ['remaining', 'remaining', { context_window: { remaining_percentage: 58 } }, '58% left'],
  ['remaining hidden', 'remaining', { context_window: { remaining_percentage: null } }, null],
  ['duration', 'duration', { cost: { total_duration_ms: 5_040_000 } }, '1h 24m'],
  ['duration hidden', 'duration', { cost: {} }, null],
  ['cost', 'cost', { cost: { total_cost_usd: 1.23 } }, '$1.23'],
  ['cost hidden', 'cost', { cost: {} }, null],
]

for (const [name, id, input, expected] of rows) {
  test(`usage: ${name}`, () => assert.equal(show(id, input), expected))
}

// --- Rate-limit windows -------------------------------------------------------
// resets_at is Unix epoch SECONDS (official contract); input.now is Date.now() ms.
// With icons off the session glyph resolves empty, so its marker falls back to `S`;
// weekly's `wk` is a literal label present in every mode.

test('fiveHour default is time-only → `S <countdown>`', () => {
  const out = show('fiveHour', { now: NOW, rate_limits: { five_hour: { used_percentage: 40, resets_at: NOW / 1000 + 2 * 3600 } } })
  assert.equal(out, 'S 2h 0m')
})

test('weekly default is time + percent → `wk <countdown> · <pct>`', () => {
  const out = show('weekly', { now: NOW, rate_limits: { seven_day: { used_percentage: 12, resets_at: NOW / 1000 + (3 * 24 + 4) * 3600 } } })
  assert.equal(out, 'wk 3d 4h · 12%')
})

test('a passed reset shows `reset due`, never a fabricated 0%', () => {
  const out = show('weekly', { now: NOW, rate_limits: { seven_day: { used_percentage: 12, resets_at: NOW / 1000 - 60 } } })
  assert.equal(out, 'wk reset due · 12%')
})

test('window hidden entirely when rate_limits absent', () => {
  assert.equal(show('fiveHour', { now: NOW, rate_limits: null }), null)
})

// isAvailable truth table: available if the window exists with EITHER source.
const avail = (rl) => BY_ID.fiveHour.isAvailable({ rate_limits: { five_hour: rl } })
test('available: percent only', () => assert.equal(avail({ used_percentage: 40 }), true))
test('available: resets only', () => assert.equal(avail({ resets_at: 123 }), true))
test('available: both', () => assert.equal(avail({ used_percentage: 40, resets_at: 123 }), true))
test('unavailable: neither source', () => assert.equal(avail({}), false))
test('unavailable: rate_limits absent', () => assert.equal(BY_ID.fiveHour.isAvailable({ rate_limits: null }), false))

// --- Toggle matrix: 4 combinations, no stray `·`, both-off collapses to '' ----
const RL = { now: NOW, rate_limits: { five_hour: { used_percentage: 40, resets_at: NOW / 1000 + 2 * 3600 } } }
const fmt = (entry) => BY_ID.fiveHour.format(RL, plain, entry)
test('toggle: time + percent', () => assert.equal(fmt({ showTime: true, showPercent: true }), 'S 2h 0m · 40%'))
test('toggle: time only', () => assert.equal(fmt({ showTime: true, showPercent: false }), 'S 2h 0m'))
test('toggle: percent only', () => assert.equal(fmt({ showTime: false, showPercent: true }), 'S 40%'))
test('toggle: both off → empty (no stray separator)', () => assert.equal(fmt({ showTime: false, showPercent: false }), ''))

// A part also hides when its own SOURCE is null, independent of the toggle.
test('time on but no resets_at → time hides; percent carries the segment', () => {
  const out = BY_ID.fiveHour.format({ now: NOW, rate_limits: { five_hour: { used_percentage: 40 } } }, plain, { showTime: true, showPercent: true })
  assert.equal(out, 'S 40%')
})

// --- Markers per glyph mode ---------------------------------------------------
const emoji = makeTheme({ glyphs: 'emoji', colors: false, icons: true })
const emojiNoIcons = makeTheme({ glyphs: 'emoji', colors: false, icons: false })
const markerOf = (theme) => BY_ID.fiveHour.format(RL, theme, { showTime: true }).split(' ')[0]
test('session marker is ⧗ in emoji mode', () => assert.equal(markerOf(emoji), '⧗'))
test('session marker falls back to S in ascii mode', () => assert.equal(markerOf(plain), 'S'))
test('session marker falls back to S when icons off, even in emoji mode', () => assert.equal(markerOf(emojiNoIcons), 'S'))
test('weekly marker is always wk, even with icons on', () => {
  const wk = BY_ID.weekly.format({ now: NOW, rate_limits: { seven_day: { used_percentage: 5, resets_at: NOW / 1000 + 10_000 } } }, emoji, { showTime: true })
  assert.ok(wk.startsWith('wk '))
})

// --- Countdown tone by time-remaining: yellow ≤90m, orange ≤45m, NEVER red ----
const colored = makeTheme({ glyphs: 'ascii', colors: true, icons: false })
const at = (minsLeft) => BY_ID.fiveHour.format(
  { now: NOW, rate_limits: { five_hour: { used_percentage: 5, resets_at: NOW / 1000 + minsLeft * 60 } } },
  colored, { showTime: true, showPercent: false },
)
test('tone boundary: 91m → neutral (dim), not green', () => {
  assert.ok(at(91).includes('\x1b[2m1h 31m\x1b[0m'))
  assert.ok(!at(91).includes('\x1b[38;2;245;203;65m') && !at(91).includes('\x1b[38;2;169;222;90m'))
})
test('tone boundary: 90m → yellow', () => assert.ok(at(90).includes('\x1b[38;2;245;203;65m1h 30m\x1b[0m')))
test('tone boundary: 46m → yellow', () => assert.ok(at(46).includes('\x1b[38;2;245;203;65m46m\x1b[0m')))
test('tone boundary: 45m → orange', () => assert.ok(at(45).includes('\x1b[38;2;239;157;43m45m\x1b[0m')))
test('tone: never red, even at 1 minute (orange, not red)', () => {
  const out = at(1)
  assert.ok(out.includes('\x1b[38;2;239;157;43m'))
  assert.ok(!out.includes('\x1b[38;2;236;37;61m') && !out.includes('38;5;196') && !out.includes('38;5;202'))
})
test('reset due is dim, never red', () => {
  const out = at(-5)
  assert.ok(out.includes('\x1b[2mreset due\x1b[0m'))
  assert.ok(!out.includes('\x1b[38;2;236;37;61m') && !out.includes('38;5;196'))
})

// Percent keeps the usage scale (green <70, yellow ≥70, red ≥90) — "no red"
// applies only to the countdown, never the percent.
const pctTone = (used) => BY_ID.fiveHour.format({ now: NOW, rate_limits: { five_hour: { used_percentage: used } } }, colored, { showTime: false, showPercent: true })
test('percent tone: 69% → green, 70% → yellow (usage boundary)', () => {
  assert.ok(pctTone(69).includes('\x1b[38;2;169;222;90m69%\x1b[0m'))
  assert.ok(pctTone(70).includes('\x1b[38;2;245;203;65m70%\x1b[0m'))
})
test('percent tone: ≥90% → red (usage signal, not the countdown)', () => {
  assert.ok(pctTone(95).includes('\x1b[38;2;236;37;61m95%\x1b[0m'))
})

// The inter-part separator is dimmed chrome, never full-bright (premium palette).
test('inter-part ` · ` is dimmed when colors are on', () => {
  const out = BY_ID.weekly.format({ now: NOW, rate_limits: { seven_day: { used_percentage: 41, resets_at: NOW / 1000 + 100 * 3600 } } }, colored, { showTime: true, showPercent: true })
  assert.ok(out.includes('\x1b[2m · \x1b[0m'))
})
