import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runUninstall, isInstalled } from '../src/commands/uninstall.js'
import { commandString } from '../src/paths.js'

// The crash. `~/.claude` need not exist — a fresh machine, a custom CLAUDE_CONFIG_DIR,
// a folder deleted by hand — and an unguarded readdirSync there threw ENOENT, so the
// LAST thing a departing user saw was a raw Node stack trace and exit 1.
test('a config dir that does not exist → says so, does not throw', async () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'ccbrief-un-')), 'never-created')
  const said = []
  const res = await runUninstall({ dir, removeDir: false, log: (m) => said.push(m) })
  assert.deepEqual(res, { restored: false, removedBlock: false })
  assert.match(said.join('\n'), /nothing to undo/)
})

// …and the CLI asks its one scary question only when there is something to remove.
test('isInstalled is false for a dir with nothing of ours in it', () => {
  assert.equal(isInstalled(join(mkdtempSync(join(tmpdir(), 'ccbrief-un-')), 'never-created')), false)
  assert.equal(isInstalled(mkdtempSync(join(tmpdir(), 'ccbrief-un-'))), false)
})

test('uninstalling nothing still says something', async () => {
  const said = []
  await runUninstall({ dir: mkdtempSync(join(tmpdir(), 'ccbrief-un-')), removeDir: false, log: (m) => said.push(m) })
  assert.match(said.join('\n'), /nothing to undo/)
})

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
