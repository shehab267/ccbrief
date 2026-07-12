// `ccbrief config` used to write config.json and stop there, so a segment change
// that alters the refresh rate never reached settings.json — the status line kept
// polling at the old rate (or not at all) until the next `init`. runConfig closes
// that gap: TUI saves → settings.json is re-synced from the config it returned.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInit } from '../src/commands/init.js'
import { runConfig, syncSettings, configOutcome } from '../src/commands/config.js'
import { loadConfig } from '../src/config.js'

const seams = (over = {}) => ({ copyRenderer: () => {}, confirm: () => true, log: () => {}, now: () => 111, ...over })
const settingsOf = (dir) => JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf8'))

// An installed dir: our statusLine, refreshInterval 60 (the defaults are time-based).
async function installed() {
  const dir = mkdtempSync(join(tmpdir(), 'ccbrief-cfg-'))
  await runInit({ dir, ...seams() })
  return dir
}

const noTimeBased = loadConfig({ preset: 'custom', segments: [{ id: 'model', enabled: true }] })
const timeBased = loadConfig({ preset: 'custom', segments: [{ id: 'fiveHour', enabled: true }] })

test('dropping every time-based segment removes refreshInterval', async () => {
  const dir = await installed()
  assert.equal(settingsOf(dir).statusLine.refreshInterval, 60)
  syncSettings({ dir, config: noTimeBased })
  assert.equal('refreshInterval' in settingsOf(dir).statusLine, false)
})

test('adding a time-based segment restores the 60s refreshInterval', async () => {
  const dir = await installed()
  syncSettings({ dir, config: noTimeBased })
  syncSettings({ dir, config: timeBased })
  assert.equal(settingsOf(dir).statusLine.refreshInterval, 60)
})

test('sync preserves unrelated settings keys', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ccbrief-cfg-'))
  writeFileSync(join(dir, 'settings.json'), JSON.stringify({ permissions: ['x'] }))
  await runInit({ dir, ...seams() })
  syncSettings({ dir, config: noTimeBased })
  assert.deepEqual(settingsOf(dir).permissions, ['x'])
})

// `config` is not an installer. If the statusLine belongs to someone else (or there
// is no settings.json at all), it must not write itself in — only `init` does that,
// and only after asking.
test('a statusLine we do not own is left alone', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ccbrief-cfg-'))
  const foreign = { statusLine: { type: 'command', command: 'my-own-script.sh' } }
  writeFileSync(join(dir, 'settings.json'), JSON.stringify(foreign))
  const res = syncSettings({ dir, config: timeBased })
  assert.equal(res.synced, false)
  assert.deepEqual(settingsOf(dir), foreign)
})

test('no settings.json → nothing is created', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ccbrief-cfg-'))
  assert.equal(syncSettings({ dir, config: timeBased }).synced, false)
  assert.equal(existsSync(join(dir, 'settings.json')), false)
})

test('quitting the TUI without saving leaves settings.json untouched', async () => {
  const dir = await installed()
  const before = readFileSync(join(dir, 'settings.json'), 'utf8')
  const res = await runConfig({ dir, tui: async () => undefined }) // esc/q → no config
  assert.equal(res.saved, false)
  assert.equal(readFileSync(join(dir, 'settings.json'), 'utf8'), before)
})

test('saving in the TUI syncs settings.json', async () => {
  const dir = await installed()
  const res = await runConfig({ dir, tui: async () => noTimeBased })
  assert.equal(res.saved, true)
  assert.equal('refreshInterval' in settingsOf(dir).statusLine, false)
})

// `config` used to print NOTHING on the way out, so a save and a discard looked
// identical: the picker cleared and the shell prompt came back either way.
test('saving says so', async () => {
  const dir = await installed()
  const said = []
  await runConfig({ dir, tui: async () => noTimeBased, log: (m) => said.push(m) })
  assert.match(said.join('\n'), /✔ Saved/)
})

test('quitting says so', async () => {
  const dir = await installed()
  const said = []
  await runConfig({ dir, tui: async () => undefined, log: (m) => said.push(m) })
  assert.match(said.join('\n'), /nothing was saved/i)
})

// The dead end: `config` before `init` writes config.json happily, syncs nothing, and
// used to say nothing — leaving you tuning a status line that would never appear.
test('configuring before installing names the command that fixes it', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ccbrief-cfg-')) // no init → no settings.json
  const said = []
  const res = await runConfig({ dir, tui: async () => noTimeBased, log: (m) => said.push(m) })
  assert.equal(res.synced, false)
  assert.match(said.join('\n'), /isn't installed yet/)
  assert.match(said.join('\n'), /ccbrief init/)
})

test('configOutcome is pure and covers all three exits', () => {
  assert.match(configOutcome({ saved: false }), /nothing was saved/i)
  assert.match(configOutcome({ saved: true, synced: true, preview: 'x', configPath: '/c' }), /no restart needed/)
  assert.match(configOutcome({ saved: true, synced: false, preview: 'x', configPath: '/c' }), /npx ccbrief init/)
})
