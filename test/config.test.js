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
  assert.equal(refreshIntervalFor(loadConfig({ preset: 'standard' })), 60) // has fiveHour (time-based)
  assert.equal(refreshIntervalFor(loadConfig({ preset: 'minimal' })), undefined)
})
test('DEFAULT_CONFIG is the standard preset', () => {
  assert.equal(DEFAULT_CONFIG.preset, 'standard')
})

// Rate-limit windows carry two independent toggles; presets inject their
// defaults, custom configs round-trip valid values and drop everything unknown.
test('preset injects fiveHour toggle defaults (time-only)', () => {
  const fh = loadConfig({ preset: 'standard' }).segments.find((s) => s.id === 'fiveHour')
  assert.deepEqual(fh, { id: 'fiveHour', enabled: true, showTime: true, showPercent: false })
})
test('detailed preset injects weekly toggle defaults (time + percent)', () => {
  const wk = loadConfig({ preset: 'detailed' }).segments.find((s) => s.id === 'weekly')
  assert.deepEqual(wk, { id: 'weekly', enabled: true, showTime: true, showPercent: true })
})
test('non-limit segments never carry toggle keys', () => {
  const repo = loadConfig({ preset: 'standard' }).segments.find((s) => s.id === 'repo')
  assert.deepEqual(repo, { id: 'repo', enabled: true })
})
test('custom preserves showTime/showPercent and drops unknown keys', () => {
  const c = loadConfig({ preset: 'custom', segments: [{ id: 'fiveHour', enabled: true, showTime: false, showPercent: true, bogus: 1 }] })
  assert.deepEqual(c.segments[0], { id: 'fiveHour', enabled: true, showTime: false, showPercent: true })
})
test('custom fills toggle defaults when omitted', () => {
  const c = loadConfig({ preset: 'custom', segments: [{ id: 'weekly', enabled: true }] })
  assert.deepEqual(c.segments[0], { id: 'weekly', enabled: true, showTime: true, showPercent: true })
})
