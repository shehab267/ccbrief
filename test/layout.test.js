import { test } from 'node:test'
import assert from 'node:assert/strict'
import { layout } from '../src/layout.js'
import { visibleWidth } from '../src/width.js'

const P = ['aaaa', 'bbbb', 'cccc', 'dddd'] // width 4 each; sep ' | ' width 3

test('auto: everything on one row when it fits', () => {
  assert.equal(layout(P, { columns: 80, mode: 'auto', sep: ' | ' }), 'aaaa | bbbb | cccc | dddd')
})

test('auto: overflow moves whole segments to next row, in order', () => {
  // width 11 (−1 margin → 10): 'aaaa | bbbb' = 11 > 10, so one per pairing
  const out = layout(P, { columns: 11, mode: 'auto', sep: ' | ', maxRows: 3 })
  const lines = out.split('\n')
  assert.ok(lines.length <= 3)
  for (const l of lines) assert.ok(visibleWidth(l) <= 10, `row too wide: ${l}`)
  assert.equal(lines[0].startsWith('aaaa'), true) // order preserved
})

test('single-line: drops trailing overflow, keeps one row', () => {
  const out = layout(P, { columns: 12, mode: 'single-line', sep: ' | ' })
  assert.equal(out.includes('\n'), false)
  assert.ok(visibleWidth(out) <= 11)
})

test('single-line: a lone oversized segment is truncated with ellipsis', () => {
  const out = layout(['abcdefghijklmnop'], { columns: 8, mode: 'single-line', sep: ' | ' })
  assert.equal(out.includes('\n'), false)
  assert.ok(out.endsWith('…'))
  assert.ok(visibleWidth(out) <= 7)
})

test('multi-line: distributes 4 segments across 3 rows', () => {
  const out = layout(P, { columns: 80, mode: 'multi-line', sep: ' | ', maxRows: 3 })
  const lines = out.split('\n')
  assert.equal(lines.length, 3)          // balanced target [2,1,1]
  assert.equal(lines[0], 'aaaa | bbbb')
})

test('≤ maxRows: extra segments beyond capacity are dropped', () => {
  const out = layout(P, { columns: 4, mode: 'auto', sep: ' | ', maxRows: 2 })
  assert.equal(out.split('\n').length, 2)
})

// --- Truncation must never sever an escape sequence -------------------------
// A cut lands wherever the columns run out, and now that every segment is
// colour-wrapped that is routinely inside an escape-delimited run. A half-written
// escape does NOT stay inside the status line: a dangling `\x1b[36m` leaves the
// rest of the terminal cyan, and an OSC 8 opening with no terminator makes the
// terminal swallow whatever is printed next.
const SGR_G = /\x1b\[[0-9;]*m/g
const OSC8_G = /\x1b\]8;;[^\x07\x1b]*(?:\x07|\x1b\\)/g

// No ESC byte survives once every COMPLETE escape is removed → none was severed.
const severed = (s) => s.replace(OSC8_G, '').replace(SGR_G, '').includes('\x1b')
const sgrBalanced = (s) => {
  const codes = s.match(SGR_G) ?? []
  const resets = codes.filter((c) => c === '\x1b[0m').length
  return codes.length - resets <= resets
}
const linksClosed = (s) => ((s.match(OSC8_G) ?? []).length % 2) === 0

test('truncating a coloured segment re-emits the reset (colour cannot leak out)', () => {
  const seg = `\x1b[36m${'a'.repeat(80)}\x1b[0m`
  const out = layout([seg], { columns: 20, sep: ' | ' })
  assert.ok(out.includes('…'), 'should have truncated')
  assert.ok(sgrBalanced(out), `unterminated SGR leaks colour past the status line: ${JSON.stringify(out)}`)
  assert.ok(out.endsWith('\x1b[0m'), 'the reset must come after the ellipsis')
})

test('truncating an OSC 8 hyperlink never severs it, and closes the link', () => {
  const link = `\x1b]8;;https://github.com/a/b/pull/1234\x07${'text '.repeat(20)}\x1b]8;;\x07`
  // Sweep widths so the cut lands at every offset — inside the URL, inside the text.
  for (let cols = 6; cols <= 40; cols++) {
    const out = layout([link], { columns: cols, sep: ' | ' })
    assert.ok(!severed(out), `severed escape at columns=${cols}: ${JSON.stringify(out)}`)
    assert.ok(linksClosed(out), `unclosed hyperlink at columns=${cols}: ${JSON.stringify(out)}`)
  }
})

test('truncation never severs an escape at any cut offset', () => {
  const seg = `\x1b[35m42%\x1b[0m \x1b[32m━━━\x1b[0m\x1b[2m──────\x1b[0m`
  for (let cols = 2; cols <= 24; cols++) {
    const out = layout([seg], { columns: cols, sep: ' | ' })
    assert.ok(!severed(out), `severed escape at columns=${cols}: ${JSON.stringify(out)}`)
    assert.ok(sgrBalanced(out), `colour leak at columns=${cols}: ${JSON.stringify(out)}`)
  }
})

test('truncation still respects the width budget it was given', () => {
  const seg = `\x1b[36m${'x'.repeat(60)}\x1b[0m`
  const out = layout([seg], { columns: 20, sep: ' | ' })
  assert.ok(visibleWidth(out) <= 19, `overflowed: ${visibleWidth(out)} cols`) // columns - margin
})
