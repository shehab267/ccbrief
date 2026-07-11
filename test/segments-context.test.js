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

test('context is a gauge: % and bar fill share the threshold tone', () => {
  const colored = makeTheme({ glyphs: 'emoji', colors: true, icons: true })
  // 95% → red (truecolor) on both the number and the filled bar, dimmed remainder
  const out = BY_ID.context.format({ context_window: { used_percentage: 95 } }, colored)
  assert.ok(out.startsWith('\x1b[38;2;236;37;61m95%\x1b[0m '))
  assert.ok(out.includes('\x1b[38;2;236;37;61m━━━━━━━━━\x1b[0m'))
  // 50% → yellow? no: 50 < 70 → green fill
  const mid = BY_ID.context.format({ context_window: { used_percentage: 50 } }, colored)
  assert.ok(mid.includes('\x1b[38;2;169;222;90m'))
})
