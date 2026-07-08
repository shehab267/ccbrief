import { test } from 'node:test'
import assert from 'node:assert/strict'
import { visibleWidth } from '../src/width.js'

const OSC8 = (url, text) => `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`

// Expected values verified empirically against string-width@7.2.0. We pin the
// widths for the exact glyphs and escape wrappers the renderer emits — this
// locks our *usage* of the library (and catches a width regression on upgrade),
// not the library's internals.
const cases = [
  ['plain ascii', 'main', 4],
  ['SGR color wrapper is zero-width', '\x1b[32mhi\x1b[0m', 2],
  ['CJK counts as 2 each', '你好', 4],
  ['emoji counts as 2', '🌿', 2],
  ['ZWJ family is width 2', '👨‍👩‍👧', 2],
  ['VS16 emoji presentation is 2', '⏱️', 2],
  ['OSC 8 hyperlink counts only visible text', OSC8('https://x.dev/pr/7', '#7 approved'), 11],
  ['mixed SGR + text', '\x1b[1m42%\x1b[0m ━━━━─────', 13],
]

for (const [name, input, expected] of cases) {
  test(`visibleWidth: ${name}`, () => {
    assert.equal(visibleWidth(input), expected)
  })
}
