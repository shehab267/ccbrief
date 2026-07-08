import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ENTRY = fileURLToPath(new URL('../src/statusline.js', import.meta.url))
const run = (stdin) => execFileSync('node', [ENTRY], { input: stdin, encoding: 'utf8', env: { ...process.env, COLUMNS: '200' } })

test('malformed stdin → empty output, exit 0', () => {
  assert.equal(run('not json at all'), '')
})
test('empty stdin → empty output', () => {
  assert.equal(run(''), '')
})
test('valid minimal stdin renders the model', () => {
  const out = run(JSON.stringify({ workspace: { current_dir: '/x/proj' }, model: { display_name: 'Opus' } }))
  assert.match(out, /Opus/)
})
