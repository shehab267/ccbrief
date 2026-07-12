import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BY_ID } from '../src/segments/index.js'
import { makeTheme } from '../src/theme.js'

const plain = makeTheme({ symbols: 'ascii', colors: false, icons: false })
const show = (id, input) => (BY_ID[id].isAvailable(input) ? BY_ID[id].format(input, plain) : null)

const rows = [
  ['effort', 'effort', { effort: { level: 'high' } }, 'high'],
  ['effort hidden', 'effort', {}, null],
  ['thinking on', 'thinking', { thinking: { enabled: true } }, 'thinking'],
  ['thinking off → hidden', 'thinking', { thinking: { enabled: false } }, null],
  ['output style', 'outputStyle', { output_style: { name: 'concise' } }, 'concise'],
  ['output style hidden', 'outputStyle', {}, null],
  ['agent', 'agent', { agent: { name: 'reviewer' } }, 'reviewer'],
  ['agent hidden', 'agent', {}, null],
]
for (const [name, id, input, expected] of rows) {
  test(`claude: ${name}`, () => assert.equal(show(id, input), expected))
}
