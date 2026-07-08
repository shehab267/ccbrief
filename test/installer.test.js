import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasStatusLine, patchSettings, backupName } from '../src/installer.js'

test('patch preserves other top-level keys', () => {
  const existing = { hooks: { x: 1 }, permissions: ['a'], enabledPlugins: ['p'] }
  const out = patchSettings(existing, { command: 'node /x/statusline.js' })
  assert.deepEqual(out.hooks, { x: 1 })
  assert.deepEqual(out.permissions, ['a'])
  assert.equal(out.statusLine.type, 'command')
  assert.equal(out.statusLine.command, 'node /x/statusline.js')
  assert.equal('refreshInterval' in out.statusLine, false)
})
test('refreshInterval included when provided', () => {
  const out = patchSettings({}, { command: 'c', refreshInterval: 60 })
  assert.equal(out.statusLine.refreshInterval, 60)
})
test('idempotent', () => {
  const once = patchSettings({ a: 1 }, { command: 'c', refreshInterval: 60 })
  const twice = patchSettings(once, { command: 'c', refreshInterval: 60 })
  assert.deepEqual(twice, once)
})
test('hasStatusLine detects an existing block', () => {
  assert.equal(hasStatusLine({ statusLine: { type: 'command', command: 'x' } }), true)
  assert.equal(hasStatusLine({}), false)
})
test('backupName format', () => {
  assert.equal(backupName(1712500000000), 'settings.json.bak.1712500000000')
})
