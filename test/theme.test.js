import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeTheme } from '../src/theme.js'

test('colors off → no ANSI', () => {
  const t = makeTheme({ glyphs: 'emoji', colors: false, icons: true })
  assert.equal(t.color('green', 'ok'), 'ok')
})

test('colors on → wraps in SGR', () => {
  const t = makeTheme({ glyphs: 'emoji', colors: true, icons: true })
  assert.equal(t.color('green', 'ok'), '\x1b[32mok\x1b[0m')
})

test('icons off → glyph is empty', () => {
  const t = makeTheme({ glyphs: 'emoji', colors: true, icons: false })
  assert.equal(t.glyph('branch'), '')
})

test('emoji branch glyph', () => {
  const t = makeTheme({ glyphs: 'emoji', colors: false, icons: true })
  assert.equal(t.glyph('branch'), '🌿')
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
