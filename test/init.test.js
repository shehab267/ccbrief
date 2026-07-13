import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInit, nextSteps } from '../src/commands/init.js'
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
  // Marks the install dir as ESM so node doesn't reparse the bundle every render.
  const pkg = JSON.parse(readFileSync(join(dir, 'ccbrief', 'package.json'), 'utf8'))
  assert.equal(pkg.type, 'module')
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

// Re-running init is an idempotent repair (relink the renderer, re-patch settings),
// NOT a factory reset — it must never throw away a config the user has tuned.
const CUSTOM = {
  version: 1, preset: 'custom', layout: 'auto', maxRows: 3, symbols: 'ascii',
  colors: false, icons: false, segments: [{ id: 'model', enabled: true }],
}

test('re-init preserves an existing config.json', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ccbrief-init-'))
  await runInit({ dir, ...seams() })
  writeFileSync(join(dir, 'ccbrief', 'config.json'), JSON.stringify(CUSTOM, null, 2) + '\n')
  await runInit({ dir, ...seams() })
  assert.deepEqual(JSON.parse(readFileSync(join(dir, 'ccbrief', 'config.json'), 'utf8')), CUSTOM)
})

// The kept config also has to drive settings.json, or the refresh rate silently
// describes the defaults instead of what the user actually configured.
test('re-init derives refreshInterval from the kept config, not the defaults', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ccbrief-init-'))
  await runInit({ dir, ...seams() })
  const first = JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf8'))
  assert.equal(first.statusLine.refreshInterval, 60) // defaults include time-based segments

  writeFileSync(join(dir, 'ccbrief', 'config.json'), JSON.stringify(CUSTOM, null, 2) + '\n')
  await runInit({ dir, ...seams() })
  const settings = JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf8'))
  assert.equal('refreshInterval' in settings.statusLine, false) // CUSTOM has no time-based segment
})

// `init` is the repair command, so it has to heal a broken config — not just an
// unparseable one. `[]`/`42`/`"x"` all parse fine yet are not a config; keeping them
// would leave the repair command staring at garbage it refused to fix.
test('a corrupt config.json is replaced with the defaults', async () => {
  for (const junk of ['{ not json', 'null', '[]', '42', '"nope"', 'true']) {
    const dir = mkdtempSync(join(tmpdir(), 'ccbrief-init-'))
    await runInit({ dir, ...seams() })
    writeFileSync(join(dir, 'ccbrief', 'config.json'), junk)
    await runInit({ dir, ...seams() })
    const config = JSON.parse(readFileSync(join(dir, 'ccbrief', 'config.json'), 'utf8'))
    assert.equal(config.preset, 'standard', `init failed to repair config.json containing ${junk}`)
  }
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

// --- What init SAYS ----------------------------------------------------------
// The installer used to print `Preview: <line>` and stop, leaving the one question a
// first-time user actually has — "…and now what?" — unanswered. These pin the answer.

test('init tells the user what to do next, not just what it rendered', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ccbrief-init-'))
  const said = []
  await runInit({ dir, ...seams({ log: (m) => said.push(m) }) })
  const out = said.join('\n')

  assert.match(out, /ccbrief installed/)
  assert.match(out, /npx ccbrief config/)      // how to change it
  assert.doesNotMatch(out, /uninstall/)        // the welcome is not the place to pitch leaving
  assert.match(out, /no restart needed/i)      // the documented behaviour, stated
  assert.match(out, /config\.json/)            // where the config lives
  assert.match(out, /42%/)                     // and the preview is still there
})

// A re-run over a config the user already tuned is an update, not a first install —
// and it must say so, or "installed" reads as "we just reset your setup".
test('a re-run reports an update and says the existing config was kept', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ccbrief-init-'))
  await runInit({ dir, ...seams() })
  const said = []
  await runInit({ dir, ...seams({ log: (m) => said.push(m) }) })
  const out = said.join('\n')
  assert.match(out, /ccbrief updated/)
  assert.match(out, /existing configuration was kept/)
  assert.doesNotMatch(out, /ccbrief installed/)
})

test('nextSteps is pure: same inputs, same words, no filesystem', () => {
  const msg = nextSteps({ preview: 'PREVIEW', configPath: '/tmp/x/config.json', fresh: true })
  assert.ok(msg.includes('PREVIEW') && msg.includes('/tmp/x/config.json'))
  assert.equal(msg, nextSteps({ preview: 'PREVIEW', configPath: '/tmp/x/config.json', fresh: true }))
})
