import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as fx from './fixtures.js'

test('all fixtures share a fixed now and a workspace', () => {
  for (const name of ['standard', 'postCompact', 'noGit', 'noRateLimits', 'proMax', 'withPr']) {
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
