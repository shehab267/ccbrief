import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadConfig, refreshIntervalFor, PRESETS, DEFAULT_CONFIG } from '../src/config.js'

test('null → defaults (standard preset)', () => {
  const c = loadConfig(null)
  assert.equal(c.preset, 'standard')
  assert.deepEqual(c.segments.map((s) => s.id), PRESETS.standard)
})
test('bad enums fall back', () => {
  const c = loadConfig({ glyphs: 'wingdings', layout: 'diagonal', maxRows: 9 })
  assert.equal(c.glyphs, 'emoji')
  assert.equal(c.layout, 'auto')
  assert.equal(c.maxRows, 3)
})
test('preset derives the segment list', () => {
  const c = loadConfig({ preset: 'minimal', segments: [{ id: 'model', enabled: true }] })
  assert.deepEqual(c.segments.map((s) => s.id), PRESETS.minimal) // preset wins over stray segments
})
test('custom keeps provided segments, drops unknown ids', () => {
  const c = loadConfig({ preset: 'custom', segments: [{ id: 'model', enabled: true }, { id: 'bogus', enabled: true }] })
  assert.deepEqual(c.segments.map((s) => s.id), ['model'])
})
test('refreshIntervalFor', () => {
  assert.equal(refreshIntervalFor(loadConfig({ preset: 'standard' })), 60) // has duration
  assert.equal(refreshIntervalFor(loadConfig({ preset: 'minimal' })), undefined)
})
test('DEFAULT_CONFIG is the standard preset', () => {
  assert.equal(DEFAULT_CONFIG.preset, 'standard')
})
