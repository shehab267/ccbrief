import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatCountdown, formatTokens } from '../src/format.js'

test('formatCountdown', () => {
  assert.equal(formatCountdown(2 * 3_600_000), '2h 0m')
  assert.equal(formatCountdown(45 * 60_000), '45m')
  // Weekly windows are days out: use a day unit, not `76h 0m`.
  assert.equal(formatCountdown((3 * 24 + 4) * 3_600_000), '3d 4h')
  assert.equal(formatCountdown(-1), 'reset due')
  assert.equal(formatCountdown(0), 'reset due')
})
test('formatTokens', () => {
  assert.equal(formatTokens(128_000), '128k')
  assert.equal(formatTokens(950), '950')
})
