import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as fx from './fixtures.js'
import { render } from '../src/render.js'
import { loadConfig } from '../src/config.js'

test('all fixtures share a fixed now and a workspace', () => {
  for (const name of ['standard', 'postCompact', 'noGit', 'noRateLimits', 'proMax', 'withPr', 'demo']) {
    const f = fx[name]
    assert.ok(f, `missing fixture: ${name}`)
    assert.equal(typeof f.now, 'number')
    assert.ok(f.workspace, `${name} needs workspace`)
  }
})

test('postCompact has null context percentages (never fabricate 0%)', () => {
  assert.equal(fx.postCompact.context_window.used_percentage, null)
  assert.equal(fx.postCompact.context_window.current_usage, null)
})

test('noGit fixture has no injected git data', () => {
  assert.equal(fx.noGit.git, null)
})

// The README's example line and the images in `assets/` are what a first-time
// visitor judges ccbrief on, and both are generated from the `demo` fixture. If
// a segment's format ever changes, this fails and tells you to re-run
// `npm run demo` and update the README — the shipped picture can never quietly
// start lying about the output.
test('the README example line is the real render of the demo fixture', () => {
  const line = render(fx.demo, loadConfig({ preset: 'detailed', colors: false }), { columns: 200 })
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8')
  assert.ok(readme.includes(line), `README no longer contains the rendered detailed line:\n${line}`)
})
