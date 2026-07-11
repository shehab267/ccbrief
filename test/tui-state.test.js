import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState, reduce, stateToConfig } from '../src/tui/state.js'
import { loadConfig, PRESETS } from '../src/config.js'

const s0 = () => initialState(loadConfig({ preset: 'standard' }))

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
test('preset resets segments', () => {
  const s = reduce(reduce(s0(), { type: 'toggle', id: 'model' }), { type: 'preset', preset: 'minimal' })
  assert.deepEqual(s.segments.map((x) => x.id), PRESETS.minimal)
  assert.equal(s.preset, 'minimal')
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
  assert.deepEqual(stateToConfig(s0()).segments.find((x) => x.id === 'fiveHour'), { id: 'fiveHour', enabled: true, showTime: true, showPercent: false })
})
test('stateToConfig round-trips through loadConfig', () => {
  const cfg = stateToConfig(reduce(s0(), { type: 'set', key: 'glyphs', value: 'ascii' }))
  assert.deepEqual(loadConfig(cfg), cfg)
})
