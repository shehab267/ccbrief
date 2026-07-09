import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInit } from '../src/commands/init.js'
import { runUninstall } from '../src/commands/uninstall.js'

const seams = (over = {}) => ({ copyRenderer: () => {}, confirm: () => true, log: () => {}, now: () => 111, ...over })

test('empty dir: writes settings + config, copies renderer', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ccbrief-init-'))
  const res = await runInit({ dir, ...seams() })
  const settings = JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf8'))
  assert.equal(settings.statusLine.type, 'command')
  // commandString quotes the path, so the command ends with a closing quote.
  assert.match(settings.statusLine.command, /ccbrief\/statusline\.js"$/)
  assert.ok(existsSync(join(dir, 'ccbrief', 'config.json')))
  assert.equal(res.changed, true)
})

test('existing settings: backup created, other keys preserved', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ccbrief-init-'))
  writeFileSync(join(dir, 'settings.json'), JSON.stringify({ permissions: ['x'] }))
  await runInit({ dir, ...seams() })
  const settings = JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf8'))
  assert.deepEqual(settings.permissions, ['x'])
  assert.ok(readdirSync(dir).some((f) => f.startsWith('settings.json.bak.')))
})

test('pre-existing statusLine: aborts when confirm=false', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ccbrief-init-'))
  writeFileSync(join(dir, 'settings.json'), JSON.stringify({ statusLine: { type: 'command', command: 'old' } }))
  const res = await runInit({ dir, ...seams({ confirm: () => false }) })
  assert.equal(res.changed, false)
  const settings = JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf8'))
  assert.equal(settings.statusLine.command, 'old') // untouched
})

test('re-init keeps one pristine backup; uninstall restores pre-ccbrief settings', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ccbrief-init-'))
  writeFileSync(join(dir, 'settings.json'), JSON.stringify({ permissions: ['x'] }))
  await runInit({ dir, ...seams({ now: () => 1000 }) })
  await runInit({ dir, ...seams({ now: () => 2000 }) }) // re-run must NOT back up our own install again
  const backups = readdirSync(dir).filter((f) => f.startsWith('settings.json.bak.'))
  assert.equal(backups.length, 1) // only the pristine pre-ccbrief backup survives
  await runUninstall({ dir, removeDir: false, log: () => {} })
  const restored = JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf8'))
  assert.equal('statusLine' in restored, false)
  assert.deepEqual(restored.permissions, ['x'])
})
