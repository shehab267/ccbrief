import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatDuration, formatCountdown, formatTokens } from '../src/format.js'

test('formatDuration', () => {
  assert.equal(formatDuration(5_040_000), '1h 24m')
  assert.equal(formatDuration(120_000), '2m')
  assert.equal(formatDuration(30_000), '<1m')
})
test('formatCountdown', () => {
  assert.equal(formatCountdown(2 * 3_600_000), '2h 0m')
  assert.equal(formatCountdown(-1), 'reset due')
  assert.equal(formatCountdown(0), 'reset due')
})
test('formatTokens', () => {
  assert.equal(formatTokens(128_000), '128k')
  assert.equal(formatTokens(950), '950')
})
