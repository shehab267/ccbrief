import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderPanel, PREVIEW_INPUT } from '../src/tui/index.js'
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
