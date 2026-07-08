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
