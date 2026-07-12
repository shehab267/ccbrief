import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderPanel, renderMarks, optionHint, PREVIEW_INPUT } from '../src/tui/index.js'
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

test('changing the symbol set changes the preview', () => {
  const base = initialState(loadConfig({ preset: 'standard', colors: false, symbols: 'emoji' }))
  const ascii = reduce(base, { type: 'set', key: 'symbols', value: 'ascii' })
  assert.notEqual(renderPanel(base, { columns: 80 }), renderPanel(ascii, { columns: 80 }))
})

// Each symbol set carries a portability note so a choice is informed — the fix
// for a user landing on nerd-font (no Nerd Font) and silently losing all icons.
test('panel labels the symbol set with its portability note', () => {
  const nerd = initialState(loadConfig({ preset: 'standard', colors: false, symbols: 'nerd-font' }))
  assert.ok(renderPanel(nerd, { columns: 120 }).includes('needs a Nerd Font'))
  const simple = initialState(loadConfig({ preset: 'standard', colors: false, symbols: 'simple' }))
  assert.ok(renderPanel(simple, { columns: 120 }).includes('same on every terminal'))
})

// The keymap footer is static — no toggle keys are crammed into it; they get a
// dedicated plain-language tip instead. So no `[t]`/`[%]`/`[d]`/`[t/%]` here.
test('footer keymap never advertises the per-segment toggle keys', () => {
  const state = initialState(loadConfig({ preset: 'detailed', colors: false }))
  const footer = renderPanel(state, { columns: 160 }).split('\n').at(-1)
  for (const k of ['[t]', '[%]', '[d]', '[t/%]']) assert.ok(!footer.includes(k))
})

// Esc is the key people reach for to back out of a TUI, so it quits alongside q —
// and the footer has to say so, or the key may as well not exist.
test('footer keymap advertises esc as a way to quit', () => {
  const state = initialState(loadConfig({ preset: 'detailed', colors: false }))
  const footer = renderPanel(state, { columns: 160 }).split('\n').at(-1)
  assert.ok(/\[esc\/q\] quit/.test(footer), footer)
})

// The toggle keys live in a one-line, plain-language tip that reads as guidance:
// it names each part, says show/hide, and appears only while an option-bearing
// row is focused — '' on every other row (and for no focus at all).
test('optionHint is a plain show/hide tip, built from the segment registry', () => {
  const limit = optionHint('fiveHour')
  assert.ok(limit.includes('show/hide'))
  assert.ok(limit.includes('[t]') && /time/.test(limit))
  assert.ok(limit.includes('[%]') && /percent/.test(limit))
  assert.equal(optionHint('weekly'), limit)                         // same two parts

  assert.equal(optionHint('repo'), 'tip: [d] diff — show/hide')     // repo's single toggle

  assert.equal(optionHint('model'), '')     // segment with no toggles → no tip
  assert.equal(optionHint(undefined), '')   // no focus → no tip, no crash
})

// The rows stay quiet: an option-bearing segment shows only its state dots
// (● shown / ○ hidden), never the keys — those moved to the tip.
test('renderMarks: option rows show state dots only, no key clutter', () => {
  const state = initialState(loadConfig({ preset: 'detailed', colors: false }))
  const at = (id) => state.segments.findIndex((s) => s.id === id)
  const lineFor = (id) => renderMarks(state, at(id)).split('\n')[at(id)]

  const five = lineFor('fiveHour')
  assert.ok(five.includes('time ●') && five.includes('percent ●')) // fiveHour default: both parts on
  assert.ok(!five.includes('[t]') && !five.includes('[%]'))       // keys are not on the row

  assert.ok(lineFor('weekly').includes('percent ●'))            // weekly default: percent on
  assert.ok(lineFor('repo').includes('diff ○'))                 // repo default: diff hidden

  // a segment with no toggles has no dots at all
  const model = lineFor('model')
  assert.ok(model.includes('model') && !model.includes('●'))
})

// Every row carries its plain-word title beside the id. `fiveHour` is a config key,
// not a sentence — the picker is where a user learns what the segment actually is.
test('renderMarks names each segment in plain words, next to its id', () => {
  const state = initialState(loadConfig({ preset: 'standard', colors: false }))
  const rows = renderMarks(state, 0).split('\n')
  const rowFor = (id) => rows[state.segments.findIndex((s) => s.id === id)]

  assert.match(rowFor('fiveHour'), /fiveHour\s+session limit \(5h\)/)
  assert.match(rowFor('repo'), /repo\s+repository \/ branch/)
  assert.match(rowFor('context'), /context\s+context used/)

  // titles and dots are aligned in columns, and no row carries trailing padding
  for (const r of rows) assert.equal(r, r.trimEnd(), `row has trailing whitespace: "${r}"`)
})

// The setting is `symbols`, so the panel and its keymap say `symbols` — the word
// `glyphs` is gone from everything a user reads.
test('the panel speaks of symbols, never glyphs', () => {
  const panel = renderPanel(initialState(loadConfig({ preset: 'standard', colors: false })), { columns: 160 })
  assert.ok(panel.includes('symbols: simple'))
  assert.ok(panel.includes('[y] symbols'))
  assert.ok(!/glyph/i.test(panel), 'the panel still says "glyph" somewhere')
})

// No abbreviations in the picker: `pct` was two saved columns bought with a word
// nobody outside the codebase uses.
test('option dots and tips spell "percent" out', () => {
  const state = initialState(loadConfig({ preset: 'detailed', colors: false }))
  const at = (id) => state.segments.findIndex((s) => s.id === id)
  const row = renderMarks(state, at('fiveHour')).split('\n')[at('fiveHour')]
  assert.ok(row.includes('percent ●') && !row.includes('pct'))
  assert.ok(optionHint('fiveHour').includes('percent') && !optionHint('fiveHour').includes('pct'))
})
