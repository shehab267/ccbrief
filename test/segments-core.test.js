import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BY_ID } from '../src/segments/index.js'
import { makeTheme } from '../src/theme.js'

const plain = makeTheme({ glyphs: 'ascii', colors: false, icons: false })
const render = (id, input) => {
  const s = BY_ID[id]
  return s.isAvailable(input) ? s.format(input, plain) : null
}

const rows = [
  ['directory basename', 'directory', { workspace: { current_dir: '/home/dev/ccbrief' } }, 'ccbrief'],
  ['directory windows path', 'directory', { workspace: { current_dir: 'C:\\src\\ccbrief' } }, 'ccbrief'],
  ['directory hidden when absent', 'directory', { workspace: {} }, null],
  ['model name', 'model', { model: { display_name: 'Opus' } }, 'Opus'],
  ['model hidden when absent', 'model', { model: {} }, null],
]

for (const [name, id, input, expected] of rows) {
  test(`core: ${name}`, () => assert.equal(render(id, input), expected))
}

test('core: model prefixes its glyph when icons are on', () => {
  const t = makeTheme({ glyphs: 'emoji', colors: false, icons: true })
  assert.equal(BY_ID.model.format({ model: { display_name: 'Opus 4.8' } }, t), '🧠 Opus 4.8')
})
