import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderPanel, renderMarks, PREVIEW_INPUT } from '../src/tui/index.js'
import { initialState, reduce, stateToConfig } from '../src/tui/state.js'
import { loadConfig } from '../src/config.js'
import { render } from '../src/render.js'

test('preview line equals render() output (WYSIWYG)', () => {
  const state = initialState(loadConfig({ preset: 'standard', colors: false }))
  const panel = renderPanel(state, { columns: 80 })
  const expected = render(PREVIEW_INPUT, stateToConfig(state), { columns: 80 })
  const previewLine = panel.split('\n').find((l) => l.includes('Preview'))
  assert.ok(previewLine)
  assert.ok(panel.includes(expected))
})

test('changing glyph mode changes the preview', () => {
  const base = initialState(loadConfig({ preset: 'standard', colors: false, glyphs: 'emoji' }))
  const ascii = reduce(base, { type: 'set', key: 'glyphs', value: 'ascii' })
  assert.notEqual(renderPanel(base, { columns: 80 }), renderPanel(ascii, { columns: 80 }))
})

// The time/pct toggle hint is context-sensitive: it appears only while a limit
// window is focused, so the footer never advertises a key that is inert on the
// current row. The old crammed `[t/%]` token is gone in every case.
test('footer shows [t] time / [%] pct only when a limit row is focused', () => {
  const state = initialState(loadConfig({ preset: 'detailed', colors: false }))
  const footerOf = (focusedId) =>
    renderPanel(state, { columns: 160, focusedId }).split('\n').at(-1)

  const onLimit = footerOf('fiveHour')
  assert.ok(onLimit.includes('[t] time') && onLimit.includes('[%] pct'))

  const onOther = footerOf('model')
  assert.ok(!onOther.includes('[t] time') && !onOther.includes('[%] pct'))

  // Default ctx (no focusedId) is a safe no-hint state, not a crash.
  const noFocus = renderPanel(state, { columns: 160 }).split('\n').at(-1)
  assert.ok(!noFocus.includes('[t] time'))

  for (const f of [onLimit, onOther, noFocus]) assert.ok(!f.includes('[t/%]'))
})

// The toggle key sits beside each option, but only on the FOCUSED limit row —
// the affordance appears at the point of action and stays off rows you aren't
// editing. Dots always reflect state; keys only show under the cursor.
test('renderMarks: focused limit row carries [t]/[%] beside its dots', () => {
  const state = initialState(loadConfig({ preset: 'detailed', colors: false }))
  const at = (id) => state.segments.findIndex((s) => s.id === id)

  const onFive = renderMarks(state, at('fiveHour')).split('\n')
  const five = onFive[at('fiveHour')]
  assert.ok(five.startsWith('▸'))
  assert.ok(five.includes('time ● [t]') && five.includes('pct ○ [%]')) // fiveHour default: time on, pct off

  // weekly is a limit row but not focused → dots only, no keys
  const weekly = onFive[at('weekly')]
  assert.ok(weekly.includes('pct ●') && !weekly.includes('[t]') && !weekly.includes('[%]'))

  // a focused NON-limit row has no toggle markup at all
  const model = renderMarks(state, at('model')).split('\n')[at('model')]
  assert.ok(model.includes('model') && !model.includes('time') && !model.includes('[t]'))
})
