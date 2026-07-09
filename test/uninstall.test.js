import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runUninstall } from '../src/commands/uninstall.js'
import { commandString } from '../src/paths.js'

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

test('no backup + malformed settings.json → does not throw', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ccbrief-un-'))
  writeFileSync(join(dir, 'settings.json'), '{ this is not: json')
  const res = await runUninstall({ dir, removeDir: false, log: () => {} })
  assert.deepEqual(res, { restored: false, removedBlock: false })
})

test('restoring a ccbrief-polluted backup strips the residual statusLine', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ccbrief-un-'))
  const cmd = commandString(join(dir, 'ccbrief')) // ccbrief's own renderer command
  writeFileSync(join(dir, 'settings.json'), JSON.stringify({ statusLine: { type: 'command', command: cmd } }))
  // A backup written by an older, buggy init that captured our own statusLine.
  writeFileSync(join(dir, 'settings.json.bak.100'), JSON.stringify({ permissions: ['x'], statusLine: { type: 'command', command: cmd } }))
  const res = await runUninstall({ dir, removeDir: false, log: () => {} })
  const s = JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf8'))
  assert.equal('statusLine' in s, false)
  assert.deepEqual(s.permissions, ['x'])
  assert.equal(res.restored, true)
})
