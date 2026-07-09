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
