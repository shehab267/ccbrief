import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeTheme } from '../src/theme.js'

test('colors off → no ANSI', () => {
  const t = makeTheme({ glyphs: 'emoji', colors: false, icons: true })
  assert.equal(t.color('green', 'ok'), 'ok')
})

test('colors on → wraps in truecolor SGR', () => {
  const t = makeTheme({ glyphs: 'emoji', colors: true, icons: true })
  // 24-bit green (38;2;169;222;90) — pinned RGB, not a palette slot the terminal
  // theme would remap, so the hue is identical on every terminal.
  assert.equal(t.color('green', 'ok'), '\x1b[38;2;169;222;90mok\x1b[0m')
})

// Identity text is toned to grey with `dim` — adaptive, so it softens the
// terminal's glaring default white without hardcoding a foreground that would
// invert on a light background. Colours-off leaves it untouched.
test('primary tones identity to adaptive grey (dim), untouched when off', () => {
  assert.equal(makeTheme({ colors: true }).primary('dir'), '\x1b[2mdir\x1b[0m')
  assert.equal(makeTheme({ colors: false }).primary('dir'), 'dir')
})

test('secondary recedes to dim when colors on, untouched when off', () => {
  assert.equal(makeTheme({ colors: true }).secondary('72k'), '\x1b[2m72k\x1b[0m')
  assert.equal(makeTheme({ colors: false }).secondary('72k'), '72k')
})

test('orange is a truecolor code', () => {
  assert.equal(makeTheme({ colors: true }).color('orange', 'x'), '\x1b[38;2;239;157;43mx\x1b[0m')
})

test('bar with a tone → colored fill + dimmed empty', () => {
  const t = makeTheme({ glyphs: 'emoji', colors: true })
  // 33% of 9 = 3 filled; fill takes the tone, remainder is dimmed
  assert.equal(t.bar(33, 9, 'green'), '\x1b[38;2;169;222;90m━━━\x1b[0m\x1b[2m──────\x1b[0m')
})

test('bar without a tone stays plain (snapshot/ascii safe)', () => {
  assert.equal(makeTheme({ colors: true }).bar(42, 9), '━━━━─────')
})

test('separators are dimmed when colors are on, plain when off', () => {
  assert.equal(makeTheme({ colors: true }).sep, '\x1b[2m │ \x1b[0m')
  assert.equal(makeTheme({ colors: false }).sep, ' │ ')
})

test('emoji reset glyph is a colorable sand-timer', () => {
  assert.equal(makeTheme({ glyphs: 'emoji', colors: false, icons: true }).glyph('reset'), '⧗')
})

test('icons off → glyph is empty', () => {
  const t = makeTheme({ glyphs: 'emoji', colors: true, icons: false })
  assert.equal(t.glyph('branch'), '')
})

test('emoji branch glyph', () => {
  const t = makeTheme({ glyphs: 'emoji', colors: false, icons: true })
  assert.equal(t.glyph('branch'), '🌿')
})

test('emoji model glyph is distinct from thinking', () => {
  const t = makeTheme({ glyphs: 'emoji', colors: false, icons: true })
  assert.equal(t.glyph('model'), '🧠')
  assert.equal(t.glyph('thinking'), '💭')
})

test('bar(42) is 4 filled + 5 empty in emoji mode', () => {
  const t = makeTheme({ glyphs: 'emoji', colors: false, icons: true })
  assert.equal(t.bar(42, 9), '━━━━─────')
})

test('ascii mode is pure ASCII', () => {
  const t = makeTheme({ glyphs: 'ascii', colors: false, icons: true })
  assert.equal(t.bar(42, 9), '####-----')
  assert.match(t.sep, /^ \| $/)
  // eslint-disable-next-line no-control-regex
  assert.ok(/^[\x00-\x7f]*$/.test(t.glyph('branch') + t.bar(50) + t.sep))
})

// `simple` is the default: no pictographs (identical everywhere), but keeps the
// universal ⧗ timer + box-drawing gauge/separator, so it still has structure.
test('simple mode: no pictographs, keeps ⧗ + box-drawing', () => {
  const t = makeTheme({ glyphs: 'simple', colors: false, icons: true })
  for (const n of ['branch', 'effort', 'model', 'duration', 'cost', 'pr', 'worktree']) {
    assert.equal(t.glyph(n), '', `${n} should have no glyph in simple mode`)
  }
  assert.equal(t.glyph('reset'), '⧗')  // the one universal symbol survives
  assert.equal(t.bar(42, 9), '━━━━─────')
  assert.match(t.sep, /^ │ $/)
})

test('simple is the default glyph mode (no glyphs arg → no branch pictograph)', () => {
  assert.equal(makeTheme({ colors: false, icons: true }).glyph('branch'), '')
})

// nerd-font is no longer empty: its glyphs are real Nerd-Font Private-Use points
// (they render only with a Nerd Font installed, but must be present, not blank).
test('nerd-font mode has non-empty PUA glyphs', () => {
  const t = makeTheme({ glyphs: 'nerd-font', colors: false, icons: true })
  assert.equal(t.glyph('branch').codePointAt(0), 0xe0a0)
  assert.ok(t.glyph('effort').length > 0 && t.glyph('model').length > 0)
})
