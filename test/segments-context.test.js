import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BY_ID } from '../src/segments/index.js'
import { makeTheme } from '../src/theme.js'

const emoji = makeTheme({ glyphs: 'emoji', colors: false, icons: true })

test('context hidden when used_percentage is null (no fake 0%)', () => {
  assert.equal(BY_ID.context.isAvailable({ context_window: { used_percentage: null } }), false)
})

test('context hidden when context_window absent', () => {
  assert.equal(BY_ID.context.isAvailable({}), false)
})

test('context renders percent + bar', () => {
  assert.equal(BY_ID.context.format({ context_window: { used_percentage: 42 } }, emoji), '42% ━━━━─────')
})

test('context available at 0 (explicit zero is real, not null)', () => {
  assert.equal(BY_ID.context.isAvailable({ context_window: { used_percentage: 0 } }), true)
})

// The number is the field's IDENTITY (flat magenta, never moves); the bar alone
// carries the STATE (green → yellow → red with the fill). Colouring both by the
// threshold said the same thing twice and left no stable hue to recognise the
// segment by.
test('context %: number is flat magenta at every fill level', () => {
  const colored = makeTheme({ glyphs: 'emoji', colors: true, icons: true })
  for (const pct of [5, 50, 75, 95]) {
    const out = BY_ID.context.format({ context_window: { used_percentage: pct } }, colored)
    assert.ok(out.startsWith(`\x1b[35m${pct}%\x1b[0m `), `${pct}% should lead with magenta`)
  }
})

test('context bar: fill ramps green → yellow → red across the thresholds', () => {
  const colored = makeTheme({ glyphs: 'emoji', colors: true, icons: true })
  const bar = (pct) => BY_ID.context.format({ context_window: { used_percentage: pct } }, colored)
  assert.ok(bar(50).includes('\x1b[32m'), '50% → green fill')
  assert.ok(bar(70).includes('\x1b[33m'), '70% → yellow fill')
  assert.ok(bar(95).includes('\x1b[31m━━━━━━━━━\x1b[0m'), '95% → full red bar')
  // ...and the number stays magenta even when the bar is red — the two differ.
  assert.ok(bar(95).startsWith('\x1b[35m95%\x1b[0m'))
})
