import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState, reduce, stateToConfig } from '../src/tui/state.js'
import { loadConfig, PRESETS } from '../src/config.js'

import { SEGMENTS } from '../src/segments/index.js'

const s0 = () => initialState(loadConfig({ preset: 'standard' }))
const enabledIds = (s) => s.segments.filter((x) => x.enabled).map((x) => x.id)

// The whole point of the catalog rework: the picker can ADD, not just subtract. Five
// segments (pr, worktree, thinking, outputStyle, agent) are in no preset, and used to
// be reachable only by hand-writing JSON you had to know existed.
test('the list is the whole catalog, with unpicked segments switched off', () => {
  const s = s0()
  assert.deepEqual(s.segments.map((x) => x.id).sort(), SEGMENTS.map((x) => x.id).sort())
  assert.deepEqual(enabledIds(s), PRESETS.standard)
})
test('the segments no preset ships are present, off, and can be turned on', () => {
  for (const id of ['pr', 'worktree', 'thinking', 'outputStyle', 'agent']) {
    const before = s0().segments.find((x) => x.id === id)
    assert.ok(before, `${id} is missing from the picker`)
    assert.equal(before.enabled, false)
    assert.ok(enabledIds(reduce(s0(), { type: 'toggle', id })).includes(id))
  }
})
// Enabled segments lead, in the order they render; the rest follow as an offer.
test('enabled segments keep their render order at the top of the list', () => {
  assert.deepEqual(s0().segments.slice(0, 4).map((x) => x.id), PRESETS.standard)
})

test('toggle flips enabled', () => {
  const s = reduce(s0(), { type: 'toggle', id: 'model' })
  assert.equal(s.segments.find((x) => x.id === 'model').enabled, false)
})
test('toggle flips preset to custom', () => {
  const s = reduce(s0(), { type: 'toggle', id: 'model' })
  assert.equal(s.preset, 'custom')
})
test('move reorders', () => {
  const s = reduce(s0(), { type: 'move', id: 'context', dir: -1 })
  assert.deepEqual(s.segments.map((x) => x.id).slice(0, 2), ['context', 'repo'])
})
test('preset resets the enabled set, in the preset\'s own order', () => {
  const s = reduce(reduce(s0(), { type: 'toggle', id: 'model' }), { type: 'preset', preset: 'detailed' })
  assert.deepEqual(enabledIds(s), PRESETS.detailed)
  assert.equal(s.preset, 'detailed')
})
test('preset injects limit toggle defaults into state', () => {
  const s = reduce(s0(), { type: 'preset', preset: 'detailed' })
  assert.deepEqual(s.segments.find((x) => x.id === 'weekly'), { id: 'weekly', enabled: true, showTime: true, showPercent: true })
})
test('setOption toggles a limit part and flips preset to custom', () => {
  const s = reduce(s0(), { type: 'setOption', id: 'fiveHour', key: 'showPercent', value: true })
  assert.equal(s.segments.find((x) => x.id === 'fiveHour').showPercent, true)
  assert.equal(s.preset, 'custom')
})
test('stateToConfig preserves showTime/showPercent', () => {
  assert.deepEqual(stateToConfig(s0()).segments.find((x) => x.id === 'fiveHour'), { id: 'fiveHour', enabled: true, showTime: true, showPercent: true })
})
test('stateToConfig round-trips through loadConfig', () => {
  const cfg = stateToConfig(reduce(s0(), { type: 'set', key: 'symbols', value: 'ascii' }))
  assert.deepEqual(loadConfig(cfg), cfg)
})
