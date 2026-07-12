import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadConfig, refreshIntervalFor, PRESETS, DEFAULT_CONFIG } from '../src/config.js'

test('null → defaults (standard preset)', () => {
  const c = loadConfig(null)
  assert.equal(c.preset, 'standard')
  assert.deepEqual(c.segments.map((s) => s.id), PRESETS.standard)
})
test('default symbol set is the universal `simple`', () => {
  assert.equal(DEFAULT_CONFIG.symbols, 'simple')
  assert.equal(loadConfig({}).symbols, 'simple')
})
test('bad enums fall back', () => {
  const c = loadConfig({ symbols: 'wingdings', layout: 'diagonal', maxRows: 9 })
  assert.equal(c.symbols, 'simple') // unknown symbol set degrades to the universal default
  assert.equal(c.layout, 'auto')
  assert.equal(c.maxRows, 3)
})
test('preset derives the segment list', () => {
  const c = loadConfig({ preset: 'standard', segments: [{ id: 'model', enabled: true }] })
  assert.deepEqual(c.segments.map((s) => s.id), PRESETS.standard) // preset wins over stray segments
})

// `minimal` was removed. A config still naming it is not an error — it degrades to
// the default preset, the same forward-compat rule every other unknown value follows.
test('the removed `minimal` preset degrades to the default', () => {
  assert.equal(PRESETS.minimal, undefined)
  const c = loadConfig({ preset: 'minimal' })
  assert.equal(c.preset, 'standard')
  assert.deepEqual(c.segments.map((s) => s.id), PRESETS.standard)
})
test('custom keeps provided segments, drops unknown ids', () => {
  const c = loadConfig({ preset: 'custom', segments: [{ id: 'model', enabled: true }, { id: 'bogus', enabled: true }] })
  assert.deepEqual(c.segments.map((s) => s.id), ['model'])
})
test('refreshIntervalFor', () => {
  assert.equal(refreshIntervalFor(loadConfig({ preset: 'standard' })), 60) // has fiveHour (time-based)
  // no time-based segment enabled → no polling at all
  assert.equal(refreshIntervalFor(loadConfig({ preset: 'custom', segments: [{ id: 'model', enabled: true }] })), undefined)
})
// A fresh install lands on `standard`: minimal is the promise, and `detailed` is one
// keypress away in the picker.
test('DEFAULT_CONFIG is the standard preset', () => {
  assert.equal(DEFAULT_CONFIG.preset, 'standard')
  assert.deepEqual(DEFAULT_CONFIG.segments.map((s) => s.id), PRESETS.standard)
})

// `glyphs` was renamed to `symbols`. A config written by an older version must keep
// its symbol set rather than silently snapping back to `simple`.
test('the legacy `glyphs` key is still honoured as `symbols`', () => {
  const c = loadConfig({ glyphs: 'emoji' })
  assert.equal(c.symbols, 'emoji')
  assert.equal('glyphs' in c, false)          // and only the new name survives the load
})
test('`symbols` wins when a config carries both names', () => {
  assert.equal(loadConfig({ symbols: 'ascii', glyphs: 'emoji' }).symbols, 'ascii')
})

// Rate-limit windows carry two independent toggles; presets inject their
// defaults, custom configs round-trip valid values and drop everything unknown.
// Both limit windows now ship with both parts: the countdown says when relief
// arrives, the percent says whether you need it.
test('preset injects fiveHour toggle defaults (time + percent)', () => {
  const fh = loadConfig({ preset: 'standard' }).segments.find((s) => s.id === 'fiveHour')
  assert.deepEqual(fh, { id: 'fiveHour', enabled: true, showTime: true, showPercent: true })
})
test('detailed preset injects weekly toggle defaults (time + percent)', () => {
  const wk = loadConfig({ preset: 'detailed' }).segments.find((s) => s.id === 'weekly')
  assert.deepEqual(wk, { id: 'weekly', enabled: true, showTime: true, showPercent: true })
})
test('repo carries its showDiff toggle (default hidden)', () => {
  const repo = loadConfig({ preset: 'standard' }).segments.find((s) => s.id === 'repo')
  assert.deepEqual(repo, { id: 'repo', enabled: true, showDiff: false })
})
test('a segment that declares no toggles carries only { id, enabled }', () => {
  const model = loadConfig({ preset: 'standard' }).segments.find((s) => s.id === 'model')
  assert.deepEqual(model, { id: 'model', enabled: true })
})
test('custom preserves showDiff and drops unknown keys', () => {
  const c = loadConfig({ preset: 'custom', segments: [{ id: 'repo', enabled: true, showDiff: false, bogus: 1 }] })
  assert.deepEqual(c.segments[0], { id: 'repo', enabled: true, showDiff: false })
})
test('custom preserves showTime/showPercent and drops unknown keys', () => {
  const c = loadConfig({ preset: 'custom', segments: [{ id: 'fiveHour', enabled: true, showTime: false, showPercent: true, bogus: 1 }] })
  assert.deepEqual(c.segments[0], { id: 'fiveHour', enabled: true, showTime: false, showPercent: true })
})
test('custom fills toggle defaults when omitted', () => {
  const c = loadConfig({ preset: 'custom', segments: [{ id: 'weekly', enabled: true }] })
  assert.deepEqual(c.segments[0], { id: 'weekly', enabled: true, showTime: true, showPercent: true })
})
