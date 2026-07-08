import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runUninstall } from '../src/commands/uninstall.js'

test('restores the most recent backup', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ccbrief-un-'))
  writeFileSync(join(dir, 'settings.json'), JSON.stringify({ statusLine: { command: 'new' }, permissions: ['x'] }))
  writeFileSync(join(dir, 'settings.json.bak.100'), JSON.stringify({ permissions: ['x'] }))
  writeFileSync(join(dir, 'settings.json.bak.200'), JSON.stringify({ permissions: ['x'], note: 'latest' }))
  const res = await runUninstall({ dir, removeDir: false, log: () => {} })
  const settings = JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf8'))
  assert.equal(settings.note, 'latest')
  assert.equal('statusLine' in settings, false)
  assert.equal(res.restored, true)
})

test('no backup → strips only the statusLine block', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ccbrief-un-'))
  writeFileSync(join(dir, 'settings.json'), JSON.stringify({ statusLine: { command: 'x' }, permissions: ['x'] }))
  const res = await runUninstall({ dir, removeDir: false, log: () => {} })
  const settings = JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf8'))
  assert.equal('statusLine' in settings, false)
  assert.deepEqual(settings.permissions, ['x'])
  assert.equal(res.removedBlock, true)
})
